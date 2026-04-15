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
from app.integrations.quickbooks.mapping_rules import propose
from app.models.account_mapping import AccountMapping
from app.models.company import Company
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.trial_balance import ChartOfAccount, TrialBalanceEntry

logger = logging.getLogger(__name__)

_REFRESH_SKEW_SECONDS = 60


class ConnectionRevokedError(Exception):
    pass


class TBConflictError(Exception):
    pass


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


def _date_range_for(company: Company, fiscal_year: int, month: int) -> tuple[str, str]:
    """Return (start_date, end_date) for the QBO TB pull.

    Cumulative TB: range is fiscal-year-start..end-of-target-month (YTD).
    Otherwise: range is just the target month.
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

    if company.is_cumulative_tb:
        return fy_start.isoformat(), target_end.isoformat()
    target_start = date(target_year, target_month, 1)
    return target_start.isoformat(), target_end.isoformat()


def propose_trial_balance(
    db: Session,
    conn: QuickBooksConnection,
    company: Company,
    fiscal_year: int,
    month: int,
) -> dict[str, Any]:
    """Pull TB from QBO and produce per-row mapping proposals (no DB writes)."""
    from app.integrations.quickbooks import client as qbo_client

    start_iso, end_iso = _date_range_for(company, fiscal_year, month)
    report = qbo_client.get_trial_balance_report(db, conn, start_iso, end_iso)
    accounts = qbo_client.list_accounts(db, conn)
    accounts_by_id = {str(a.get("Id")): a for a in accounts}

    existing_mappings = {
        m.account_number: m
        for m in db.query(AccountMapping).filter(AccountMapping.company_id == company.id).all()
    }

    rows: list[dict[str, Any]] = []
    for r in parse_trial_balance_report(report):
        acct_meta = accounts_by_id.get(str(r["qbo_account_id"]), {})
        acct_num = acct_meta.get("AcctNum") or r["account_number"]
        type_ = acct_meta.get("AccountType")
        sub_type = acct_meta.get("AccountSubType")
        prop = propose(type_, sub_type, r["account_name"])
        existing = existing_mappings.get(acct_num)
        rows.append({
            "qbo_account_id": r["qbo_account_id"],
            "account_number": acct_num,
            "account_name": r["account_name"],
            "qbo_account_type": type_,
            "qbo_account_sub_type": sub_type,
            "debit": r["debit"],
            "credit": r["credit"],
            "proposed_link_code": prop.link_code,
            "confidence": prop.confidence,
            "existing_link_code": existing.link_code if existing else None,
        })
    return {"currency": company.currency, "rows": rows}


def commit_trial_balance(
    db: Session,
    company: Company,
    fiscal_year: int,
    month: int,
    rows: list[dict],
    overwrite: bool,
) -> dict[str, int]:
    """Upsert ChartOfAccount + AccountMapping + TrialBalanceEntry transactionally."""
    # Serialize concurrent commits for the same company; SQLite may ignore FOR UPDATE
    db.execute(select(Company).where(Company.id == company.id).with_for_update())

    existing_count = (
        db.query(TrialBalanceEntry)
        .filter(
            TrialBalanceEntry.company_id == company.id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month == month,
        )
        .count()
    )
    if existing_count > 0 and not overwrite:
        raise TBConflictError(
            f"Trial balance already exists for {fiscal_year}-{month:02d}"
        )
    if existing_count > 0:
        db.query(TrialBalanceEntry).filter(
            TrialBalanceEntry.company_id == company.id,
            TrialBalanceEntry.fiscal_year == fiscal_year,
            TrialBalanceEntry.month == month,
        ).delete()
        db.flush()

    accounts_imported = 0
    mappings_created = 0
    mappings_updated = 0

    chart_by_num = {
        c.account_number: c
        for c in db.query(ChartOfAccount).filter(ChartOfAccount.company_id == company.id).all()
    }
    mapping_by_num = {
        m.account_number: m
        for m in db.query(AccountMapping).filter(AccountMapping.company_id == company.id).all()
    }

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

        amount = float(r.get("debit", 0) or 0) - float(r.get("credit", 0) or 0)
        db.add(TrialBalanceEntry(
            company_id=company.id,
            account_id=chart.id,
            fiscal_year=fiscal_year,
            month=month,
            amount=amount,
        ))
        accounts_imported += 1

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

    db.commit()
    return {
        "accounts_imported": accounts_imported,
        "mappings_created": mappings_created,
        "mappings_updated": mappings_updated,
    }
