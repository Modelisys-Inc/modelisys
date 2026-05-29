"""QuickBooks connection lifecycle + TB pull/commit orchestration."""
from __future__ import annotations

import logging
import uuid
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations.quickbooks import encryption, oauth
from app.models.account_mapping import AccountMapping
from app.models.company import Company
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.trial_balance import ChartOfAccount, TrialBalanceEntry

logger = logging.getLogger(__name__)

_REFRESH_SKEW_SECONDS = 60


class ConnectionRevokedError(Exception):
    pass


class TBConflictError(Exception):
    pass


class InvalidLinkCodesError(Exception):
    def __init__(self, offending: list[tuple[str, str]]):
        # offending is list of (account_number, link_code)
        self.offending = offending
        super().__init__(
            "Invalid link codes: " + ", ".join(f"{a}={c}" for a, c in offending)
        )


class DataDriftError(Exception):
    def __init__(self, new_accounts: list[str]):
        self.new_accounts = new_accounts
        super().__init__(
            "Data drift: new accounts in QBO that were not in preview: "
            + ", ".join(new_accounts)
        )


def upsert_connection(
    db: Session,
    company_id: uuid.UUID,
    realm_id: str,
    tokens: oauth.TokenResponse,
    user_id: uuid.UUID,
) -> QuickBooksConnection:
    now = datetime.now(timezone.utc)
    conn = (
        db.query(QuickBooksConnection)
        .filter(QuickBooksConnection.company_id == company_id)
        .first()
    )
    if conn is None:
        conn = QuickBooksConnection(
            company_id=company_id,
            realm_id=realm_id,
            access_token=encryption.encrypt(tokens.access_token),
            refresh_token=encryption.encrypt(tokens.refresh_token),
            access_token_expires_at=now + timedelta(seconds=tokens.expires_in),
            refresh_token_expires_at=now + timedelta(seconds=tokens.x_refresh_token_expires_in),
            status="active",
            connected_by_user_id=user_id,
        )
        db.add(conn)
    else:
        conn.realm_id = realm_id
        conn.access_token = encryption.encrypt(tokens.access_token)
        conn.refresh_token = encryption.encrypt(tokens.refresh_token)
        conn.access_token_expires_at = now + timedelta(seconds=tokens.expires_in)
        conn.refresh_token_expires_at = now + timedelta(seconds=tokens.x_refresh_token_expires_in)
        conn.status = "active"
        conn.connected_by_user_id = user_id
    db.commit()
    db.refresh(conn)
    return conn


def get_valid_access_token(db: Session, conn: QuickBooksConnection) -> str:
    """Return a non-expired access token, refreshing if needed."""
    if conn.status != "active":
        raise ConnectionRevokedError("connection is not active")

    now = datetime.now(timezone.utc)
    expires_at = conn.access_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at > now + timedelta(seconds=_REFRESH_SKEW_SECONDS):
        return encryption.decrypt(conn.access_token)

    refresh_plain = encryption.decrypt(conn.refresh_token)
    try:
        new_tokens = oauth.refresh_tokens(refresh_plain)
    except oauth.TokenExchangeError as e:
        logger.warning("QBO refresh failed for company %s: %s", conn.company_id, e)
        conn.status = "revoked"
        db.commit()
        raise ConnectionRevokedError("refresh failed") from e

    conn.access_token = encryption.encrypt(new_tokens.access_token)
    conn.refresh_token = encryption.encrypt(new_tokens.refresh_token)
    conn.access_token_expires_at = now + timedelta(seconds=new_tokens.expires_in)
    conn.refresh_token_expires_at = now + timedelta(seconds=new_tokens.x_refresh_token_expires_in)
    db.commit()
    db.refresh(conn)
    return new_tokens.access_token


def disconnect(db: Session, conn: QuickBooksConnection) -> None:
    try:
        oauth.revoke_token(encryption.decrypt(conn.refresh_token))
    except oauth.TokenExchangeError as e:
        logger.warning(
            "QBO revoke failed for company %s: %s — proceeding with local delete",
            conn.company_id, e,
        )
    db.delete(conn)
    db.commit()


# ============= TB pull =============


def parse_trial_balance_report(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the nested QBO TrialBalance report into rows.

    QBO returns Rows.Row with each row having ColData=[name, debit, credit].
    Section rows wrap nested Rows.Row recursively.
    """
    out: list[dict[str, Any]] = []

    def walk(rows: list[dict[str, Any]]):
        for row in rows:
            row_type = row.get("type", "")
            if row_type == "Section" and "Rows" in row and "Row" in row.get("Rows", {}):
                walk(row["Rows"]["Row"])
                continue
            cols = row.get("ColData")
            if not cols or len(cols) < 3:
                continue
            name_col = cols[0]
            name_value = name_col.get("value", "") or ""
            qbo_account_id = name_col.get("id", "") or ""
            account_number = ""
            account_name = name_value
            stripped = name_value.rstrip()
            if "(" in stripped and stripped.endswith(")"):
                open_paren = stripped.rfind("(")
                account_name = stripped[:open_paren].strip()
                account_number = stripped[open_paren + 1:-1].strip()
            try:
                debit = float(cols[1].get("value", "") or 0)
            except (ValueError, TypeError):
                debit = 0.0
            try:
                credit = float(cols[2].get("value", "") or 0)
            except (ValueError, TypeError):
                credit = 0.0
            out.append({
                "qbo_account_id": qbo_account_id,
                "account_number": account_number or qbo_account_id,
                "account_name": account_name,
                "debit": debit,
                "credit": credit,
            })

    rows = report.get("Rows", {}).get("Row", [])
    walk(rows)
    return out


def _gl_column_index(report: dict[str, Any]) -> dict[str, int]:
    """Map GL column keys (klass_name, dept_name, ...) to their ColData index."""
    index: dict[str, int] = {}
    columns = report.get("Columns", {}).get("Column", [])
    for i, col in enumerate(columns):
        key = None
        for meta in col.get("MetaData", []) or []:
            if meta.get("Name") == "ColKey":
                key = meta.get("Value")
                break
        if not key:
            key = col.get("ColType")
        if key:
            index[key] = i
    return index


def _parse_general_ledger(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten the GL report into rows: account (from section header) + class/location.

    GL nests transaction lines under per-account Section headers. The account
    identity lives on the section header; each data line carries its own
    klass_name / dept_name positionally per the Columns array.
    """
    col_index = _gl_column_index(report)
    klass_idx = col_index.get("klass_name")
    dept_idx = col_index.get("dept_name")
    out: list[dict[str, Any]] = []

    def cell(cols: list[dict[str, Any]], idx: int | None) -> str:
        if idx is None or idx >= len(cols):
            return ""
        return (cols[idx].get("value") or "").strip()

    def walk(rows: list[dict[str, Any]], account_id: str, account_name: str):
        for row in rows:
            if row.get("type") == "Section":
                acct_id, acct_name = account_id, account_name
                header = row.get("Header")
                if header and header.get("ColData"):
                    hcols = header["ColData"]
                    acct_name = (hcols[0].get("value") or "").strip() or account_name
                    acct_id = (hcols[0].get("id") or "").strip() or account_id
                walk(row.get("Rows", {}).get("Row", []), acct_id, acct_name)
                continue
            cols = row.get("ColData")
            if not cols:
                continue
            out.append({
                "account_id": account_id,
                "account_name": account_name,
                "class_name": cell(cols, klass_idx),
                "location_name": cell(cols, dept_idx),
            })

    walk(report.get("Rows", {}).get("Row", []), "", "")
    return out


def _empty_discovery() -> dict[str, Any]:
    return {"by_account": {}, "observed_pairs": set(), "classes": set(), "locations": set()}


def discover_class_location_tags(
    report: dict[str, Any], accounts_by_id: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    """Derive per-account class/location membership + observed pairs from GL.

    by_account: { account_number: {"classes": set, "locations": set} }
    observed_pairs: set of (class_name, location_name) where a single line had both
    classes / locations: global sets across all accounts
    """
    result = _empty_discovery()
    by_account: dict[str, dict[str, set]] = result["by_account"]

    for line in _parse_general_ledger(report):
        meta = accounts_by_id.get(str(line["account_id"]), {})
        acct_num = meta.get("AcctNum") or line["account_id"]
        if not acct_num:
            continue
        entry = by_account.setdefault(acct_num, {"classes": set(), "locations": set()})
        cls = line["class_name"]
        loc = line["location_name"]
        if cls:
            entry["classes"].add(cls)
            result["classes"].add(cls)
        if loc:
            entry["locations"].add(loc)
            result["locations"].add(loc)
        if cls and loc:
            result["observed_pairs"].add((cls, loc))

    return result


def _merge_tag_csv(existing_csv: str | None, discovered: list[str]) -> list[str]:
    """Union of an existing comma-separated tag field and discovered values, deduped + sorted."""
    seen: set[str] = set()
    for token in [p for p in (existing_csv or "").split(",")] + list(discovered):
        t = token.strip()
        if t and t not in seen:
            seen.add(t)
    return sorted(seen)


def _prefs_tracking_off(prefs_body: dict[str, Any]) -> bool:
    """True only if Preferences clearly report BOTH class and location tracking off.

    Used purely as an optimization to skip the heavy GL pull. Unknown / missing
    fields return False (we then fall back to running GL and trusting its data).
    """
    acct = prefs_body.get("Preferences", {}).get("AccountingInfoPrefs", {})
    if not acct:
        return False
    class_on = bool(acct.get("ClassTrackingPerTxn") or acct.get("ClassTrackingPerTxnLine"))
    loc_on = bool(acct.get("TrackDepartments"))
    return ("ClassTrackingPerTxn" in acct or "ClassTrackingPerTxnLine" in acct) \
        and "TrackDepartments" in acct and not class_on and not loc_on


def run_class_location_discovery(
    db: Session,
    conn: QuickBooksConnection,
    company: Company,
    fiscal_year: int,
    months: list[int],
    accounts_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Fetch + parse GL into discovery. Best-effort: any failure → empty discovery."""
    from app.integrations.quickbooks import client as qbo_client

    try:
        try:
            prefs = qbo_client.get_preferences(db, conn)
            if _prefs_tracking_off(prefs):
                return _empty_discovery()
        except Exception:  # preferences is only an optimization — ignore failures
            pass
        # One GL pull over the widest YTD window covering all selected months.
        start_iso, end_iso = _date_range_for(company, fiscal_year, max(months))
        report = qbo_client.get_general_ledger_report(db, conn, start_iso, end_iso)
        return discover_class_location_tags(report, accounts_by_id)
    except Exception as e:  # noqa: BLE001 — discovery must never block the TB import
        logger.warning("QBO class/location discovery failed for company %s: %s", company.id, e)
        return _empty_discovery()


def _date_range_for(company: Company, fiscal_year: int, month: int) -> tuple[str, str]:
    """Return (start_date, end_date) for the QBO TB pull.

    QBO imports are always cumulative (YTD): fiscal-year-start..end-of-target-month.
    """
    fye_month, _fye_day = (int(p) for p in company.fiscal_year_end.split("-"))
    fy_start_month = (fye_month % 12) + 1
    if fy_start_month == 1:
        fy_start_year = fiscal_year
    else:
        fy_start_year = fiscal_year - 1
    fy_start = date(fy_start_year, fy_start_month, 1)

    months_into_fy = month - fy_start_month
    if months_into_fy < 0:
        months_into_fy += 12
    target_year = fy_start_year + ((fy_start_month - 1 + months_into_fy) // 12)
    target_month = ((fy_start_month - 1 + months_into_fy) % 12) + 1
    target_end = date(target_year, target_month, monthrange(target_year, target_month)[1])

    return fy_start.isoformat(), target_end.isoformat()


def propose_trial_balance(
    db: Session,
    conn: QuickBooksConnection,
    company: Company,
    fiscal_year: int,
    months: list[int],
) -> dict[str, Any]:
    """Pull TB from QBO for each month and produce a union of accounts.

    Returns rows keyed by account_number; each row carries a sparse
    monthly_amounts dict (only months where the account had an entry).
    No DB writes.
    """
    from app.integrations.quickbooks import client as qbo_client

    accounts = qbo_client.list_accounts(db, conn)
    accounts_by_id = {str(a.get("Id")): a for a in accounts}

    existing_mappings = {
        m.account_number: m
        for m in db.query(AccountMapping)
        .filter(AccountMapping.company_id == company.id)
        .all()
    }

    union: dict[str, dict[str, Any]] = {}
    for m in months:
        start_iso, end_iso = _date_range_for(company, fiscal_year, m)
        report = qbo_client.get_trial_balance_report(db, conn, start_iso, end_iso)
        for r in parse_trial_balance_report(report):
            acct_meta = accounts_by_id.get(str(r["qbo_account_id"]), {})
            acct_num = acct_meta.get("AcctNum") or r["account_number"]
            row = union.setdefault(acct_num, {
                "qbo_account_id": r["qbo_account_id"],
                "account_number": acct_num,
                "account_name": r["account_name"],
                "qbo_account_type": acct_meta.get("AccountType"),
                "qbo_account_sub_type": acct_meta.get("AccountSubType"),
                "existing_link_code": (
                    existing_mappings[acct_num].link_code
                    if acct_num in existing_mappings else None
                ),
                "monthly_amounts": {},
            })
            row["monthly_amounts"][str(m)] = {
                "debit": r["debit"],
                "credit": r["credit"],
            }

    discovery = run_class_location_discovery(
        db, conn, company, fiscal_year, months, accounts_by_id
    )
    by_account = discovery["by_account"]
    for acct_num, row in union.items():
        disc = by_account.get(acct_num, {"classes": set(), "locations": set()})
        disc_divs = sorted(disc["classes"])
        disc_subs = sorted(disc["locations"])
        existing = existing_mappings.get(acct_num)
        row["discovered_divisions"] = disc_divs
        row["discovered_sub_divisions"] = disc_subs
        row["divisions"] = _merge_tag_csv(
            existing.divisions if existing else None, disc_divs
        )
        row["sub_divisions"] = _merge_tag_csv(
            existing.sub_divisions if existing else None, disc_subs
        )

    existing_months = sorted({
        e.month
        for e in db.query(TrialBalanceEntry)
        .filter(
            TrialBalanceEntry.company_id == company.id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month.in_(months),
        )
        .all()
    })

    return {
        "currency": company.currency,
        "rows": list(union.values()),
        "existing_months": existing_months,
        "observed_pairs": [
            {"division": c, "sub_division": l}
            for (c, l) in sorted(discovery["observed_pairs"])
        ],
        "class_location_tracking": {
            "classes": bool(discovery["classes"]),
            "locations": bool(discovery["locations"]),
        },
    }


def commit_trial_balance(
    db: Session,
    conn: QuickBooksConnection,
    company: Company,
    fiscal_year: int,
    months: list[int],
    rows: list[dict],
    overwrite: bool,
) -> dict[str, int]:
    """Upsert ChartOfAccount + AccountMapping + TrialBalanceEntry for N months.

    Re-pulls QBO TB for every month before opening the write transaction;
    any pull failure aborts with nothing written. QBO imports are cumulative,
    so the company is forced into cumulative-TB mode.
    """
    from app.integrations.quickbooks import client as qbo_client

    # ---- validate link codes against statement structure ----
    structures = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company.id)
        .all()
    )
    valid_codes: set[str] = set()

    def _collect(node):
        if isinstance(node, list):
            for item in node:
                _collect(item)
        elif isinstance(node, dict):
            code = node.get("linkCode") or node.get("link_code")
            if code:
                valid_codes.add(str(code))
            for key in ("children", "detailRows"):
                _collect(node.get(key))

    for s in structures:
        _collect(s.structure)

    offending: list[tuple[str, str]] = []
    for r in rows:
        if r.get("skip"):
            continue
        link_code = r.get("link_code")
        if not link_code or link_code not in valid_codes:
            offending.append((str(r.get("account_number") or ""), str(link_code or "")))
    if offending:
        raise InvalidLinkCodesError(offending)

    # ---- re-pull QBO TB for every month (no DB writes yet) ----
    accounts = qbo_client.list_accounts(db, conn)
    accounts_by_id = {str(a.get("Id")): a for a in accounts}

    repulled: dict[int, list[dict[str, Any]]] = {}
    for m in months:
        start_iso, end_iso = _date_range_for(company, fiscal_year, m)
        report = qbo_client.get_trial_balance_report(db, conn, start_iso, end_iso)
        parsed = parse_trial_balance_report(report)
        # Backfill account_number from list_accounts metadata.
        for p in parsed:
            meta = accounts_by_id.get(str(p["qbo_account_id"]), {})
            p["account_number"] = meta.get("AcctNum") or p["account_number"]
        repulled[m] = parsed

    # ---- data drift: any account in re-pull that isn't in user's rows? ----
    user_account_nums = {r["account_number"] for r in rows}
    repulled_account_nums: set[str] = set()
    for parsed in repulled.values():
        for p in parsed:
            repulled_account_nums.add(p["account_number"])
    new_accounts = sorted(repulled_account_nums - user_account_nums)
    if new_accounts:
        raise DataDriftError(new_accounts)

    rows_by_num = {r["account_number"]: r for r in rows}

    # ---- transaction ----
    db.execute(select(Company).where(Company.id == company.id).with_for_update())

    if not company.is_cumulative_tb:
        company.is_cumulative_tb = True

    conflicting_months = [
        m for m in months
        if db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company.id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month == m,
        ).count() > 0
    ]
    if conflicting_months and not overwrite:
        raise TBConflictError(
            f"Trial balance already exists for months: "
            f"{', '.join(str(m) for m in conflicting_months)}"
        )
    if conflicting_months:
        db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company.id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month.in_(conflicting_months),
        ).delete(synchronize_session=False)
        db.flush()

    chart_by_num = {
        c.account_number: c
        for c in db.query(ChartOfAccount).filter(ChartOfAccount.company_id == company.id).all()
    }
    mapping_by_num = {
        m.account_number: m
        for m in db.query(AccountMapping).filter(AccountMapping.company_id == company.id).all()
    }

    mappings_created = 0
    mappings_updated = 0
    accounts_written: set[str] = set()

    # Upsert ChartOfAccount + AccountMapping once per non-skipped row.
    for r in rows:
        if r.get("skip"):
            continue
        acct_num = r["account_number"]
        acct_name = r["account_name"]
        link_code = r.get("link_code")

        chart = chart_by_num.get(acct_num)
        if chart is None:
            chart = ChartOfAccount(
                company_id=company.id,
                account_number=acct_num,
                account_name=acct_name,
            )
            db.add(chart)
            db.flush()
            chart_by_num[acct_num] = chart
        elif chart.account_name != acct_name:
            chart.account_name = acct_name

        existing = mapping_by_num.get(acct_num)
        if existing is None:
            db.add(AccountMapping(
                company_id=company.id,
                account_number=acct_num,
                description=acct_name,
                link_code=link_code,
            ))
            mappings_created += 1
        else:
            if existing.link_code != link_code or existing.description != acct_name:
                existing.link_code = link_code
                existing.description = acct_name
                mappings_updated += 1

    # Insert one TrialBalanceEntry per (account, month) from the re-pull.
    for m in months:
        for p in repulled[m]:
            acct_num = p["account_number"]
            user_row = rows_by_num.get(acct_num)
            if user_row is None or user_row.get("skip"):
                continue
            chart = chart_by_num[acct_num]
            amount = float(p["debit"]) - float(p["credit"])
            db.add(TrialBalanceEntry(
                company_id=company.id,
                account_id=chart.id,
                fiscal_year=fiscal_year,
                month=m,
                amount=amount,
            ))
            accounts_written.add(acct_num)

    db.commit()
    return {
        "months_imported": len(months),
        "accounts_imported": len(accounts_written),
        "mappings_created": mappings_created,
        "mappings_updated": mappings_updated,
    }
