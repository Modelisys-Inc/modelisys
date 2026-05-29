# QuickBooks Class/Location → Division/SubDivision Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** During the QBO trial-balance import, auto-populate each account's `divisions`/`sub_divisions` tags from the QBO Classes and Locations it appears under (Class → division, Location → sub_division), reviewable/editable in the preview and written on commit, and build the Division→SubDivision selector tree from observed (Class, Location) combinations.

**Architecture:** A new General Ledger report pull (single fetch per import) is parsed into per-account class/location membership plus observed (class, location) pairs. The preview merges discovered values with any existing tags (union) and returns them per-row; the commit writes the user-approved tags onto `AccountMapping` (comma-joined CSV, matching today's free-text format) and upserts `Division`/`SubDivision` rows for observed pairs — all inside the existing TB write transaction. Discovery is **best-effort**: any QBO/GL failure degrades to empty tags and never blocks the TB import. The authoritative "is tracking on" flags are derived from whether discovery actually found classes/locations, so the feature is robust to QBO Preferences field-name variation.

**Tech Stack:** FastAPI / SQLAlchemy 2.0 (sync `Session` in this connector) / pydantic / pytest + respx (backend); Next.js 16 / React 19 / TypeScript / Playwright (frontend).

**Spec:** `docs/superpowers/specs/2026-05-28-quickbooks-class-location-tagging-design.md`

---

## File Structure

**Backend — modify:**
- `backend/app/integrations/quickbooks/client.py` — add `get_preferences`, `get_general_ledger_report`.
- `backend/app/integrations/quickbooks/service.py` — add `_parse_general_ledger`, `discover_class_location_tags`, `_merge_tag_csv`, `_empty_discovery`; wire discovery into `propose_trial_balance` and `commit_trial_balance`.
- `backend/app/schemas/quickbooks.py` — extend `TrialBalanceRowProposal`, `TrialBalancePreviewResponse`, `TrialBalanceCommitRow`.
- `backend/app/integrations/quickbooks/router.py` — pass new response fields through preview endpoint.

**Backend — create:**
- `backend/tests/integrations/quickbooks/test_class_location_discovery.py` — parser + discovery + preview/commit tests.

**Frontend — modify:**
- `frontend/lib/api.ts` — extend QBO preview/commit types.
- `frontend/components/quickbooks-review-table.tsx` — render + edit Division/Sous-division columns.
- `frontend/e2e/quickbooks.spec.ts` — e2e coverage for the new columns.

**Frontend — create:**
- `frontend/components/quickbooks-tag-cell.tsx` — reusable multi-value chip editor for a single cell.

---

## Task 1: QBO client — Preferences + General Ledger report

**Files:**
- Modify: `backend/app/integrations/quickbooks/client.py`
- Test: `backend/tests/integrations/quickbooks/test_class_location_discovery.py` (create)

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/integrations/quickbooks/test_class_location_discovery.py`:

```python
from datetime import datetime, timedelta, timezone

import respx
from httpx import Response

from app.config import settings
from app.integrations.quickbooks import client as qbo_client
from app.integrations.quickbooks import oauth, service
from app.models.quickbooks_connection import QuickBooksConnection


def _make_conn(db, company, user):
    tokens = oauth.TokenResponse(
        access_token="AT", refresh_token="RT",
        expires_in=3600, x_refresh_token_expires_in=8640000,
    )
    return service.upsert_connection(db, company.id, "realm-1", tokens, user.id)


@respx.mock
def test_get_general_ledger_report_requests_columns(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    base = settings.intuit_api_base
    route = respx.get(f"{base}/v3/company/realm-1/reports/GeneralLedger").mock(
        return_value=Response(200, json={"Rows": {"Row": []}})
    )
    qbo_client.get_general_ledger_report(db, conn, "2024-01-01", "2024-03-31")
    assert route.called
    sent = route.calls.last.request
    assert b"klass_name" in sent.url.query
    assert b"dept_name" in sent.url.query
    assert b"GeneralLedger" in sent.url.path.encode()


@respx.mock
def test_get_preferences_returns_json(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    base = settings.intuit_api_base
    respx.get(f"{base}/v3/company/realm-1/preferences").mock(
        return_value=Response(200, json={
            "Preferences": {"AccountingInfoPrefs": {"ClassTrackingPerTxn": True}}
        })
    )
    body = qbo_client.get_preferences(db, conn)
    assert body["Preferences"]["AccountingInfoPrefs"]["ClassTrackingPerTxn"] is True
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py -v`
Expected: FAIL with `AttributeError: module 'app.integrations.quickbooks.client' has no attribute 'get_general_ledger_report'`.

- [ ] **Step 3: Implement the client methods**

In `backend/app/integrations/quickbooks/client.py`, append after `list_accounts`:

```python
# Columns we request from the GL report. klass_name / dept_name are only
# populated when the company has class / location tracking enabled.
_GL_COLUMNS = "tx_date,account_name,klass_name,dept_name,subt_nat_amount"


def get_general_ledger_report(
    db: Session, conn: QuickBooksConnection, start_date: str, end_date: str
) -> dict[str, Any]:
    # QBO Reports API returns the full report in one response (no STARTPOSITION
    # pagination like the query endpoint) — a single request is sufficient.
    return _request(
        db, conn, "GET", "/reports/GeneralLedger",
        params={
            "start_date": start_date,
            "end_date": end_date,
            "accounting_method": "Accrual",
            "columns": _GL_COLUMNS,
        },
    )


def get_preferences(db: Session, conn: QuickBooksConnection) -> dict[str, Any]:
    return _request(db, conn, "GET", "/preferences")
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/app/integrations/quickbooks/client.py backend/tests/integrations/quickbooks/test_class_location_discovery.py
git commit -m "feat(qbo): add GeneralLedger report + preferences client methods"
```

---

## Task 2: Parse the General Ledger report into account/class/location rows

GL groups transaction lines under per-account **Section headers**; the account identity comes from the section header (`ColData[0]` with `value` + `id`), and each nested data row carries its `klass_name` / `dept_name` positionally per the `Columns` array. `_parse_general_ledger` flattens this into flat records.

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py`
- Test: `backend/tests/integrations/quickbooks/test_class_location_discovery.py`

- [ ] **Step 1: Write the failing test**

Append to `test_class_location_discovery.py`:

```python
from app.integrations.quickbooks.service import _parse_general_ledger

_GL_REPORT = {
    "Columns": {"Column": [
        {"ColType": "tx_date", "MetaData": [{"Name": "ColKey", "Value": "tx_date"}]},
        {"ColType": "account_name", "MetaData": [{"Name": "ColKey", "Value": "account_name"}]},
        {"ColType": "string", "MetaData": [{"Name": "ColKey", "Value": "klass_name"}]},
        {"ColType": "string", "MetaData": [{"Name": "ColKey", "Value": "dept_name"}]},
        {"ColType": "money", "MetaData": [{"Name": "ColKey", "Value": "subt_nat_amount"}]},
    ]},
    "Rows": {"Row": [
        {
            "type": "Section",
            "Header": {"ColData": [{"value": "Sales (4000)", "id": "33"}]},
            "Rows": {"Row": [
                {"ColData": [
                    {"value": "2024-01-05"}, {"value": ""},
                    {"value": "East"}, {"value": "Montreal"}, {"value": "100.00"},
                ]},
                {"ColData": [
                    {"value": "2024-02-05"}, {"value": ""},
                    {"value": "West"}, {"value": ""}, {"value": "50.00"},
                ]},
            ]},
        },
        {
            "type": "Section",
            "Header": {"ColData": [{"value": "Rent (6000)", "id": "44"}]},
            "Rows": {"Row": [
                {"ColData": [
                    {"value": "2024-01-31"}, {"value": ""},
                    {"value": ""}, {"value": "Quebec"}, {"value": "900.00"},
                ]},
            ]},
        },
    ]},
}


def test_parse_general_ledger_flattens_account_class_location():
    rows = _parse_general_ledger(_GL_REPORT)
    assert {
        "account_id": "33", "account_name": "Sales (4000)",
        "class_name": "East", "location_name": "Montreal",
    } in rows
    # class-only line keeps location empty
    assert any(
        r["account_id"] == "33" and r["class_name"] == "West"
        and r["location_name"] == "" for r in rows
    )
    # location-only line keeps class empty, account from its own section header
    assert any(
        r["account_id"] == "44" and r["class_name"] == ""
        and r["location_name"] == "Quebec" for r in rows
    )
    assert len(rows) == 3
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py::test_parse_general_ledger_flattens_account_class_location -v`
Expected: FAIL with `ImportError: cannot import name '_parse_general_ledger'`.

- [ ] **Step 3: Implement the parser**

In `backend/app/integrations/quickbooks/service.py`, add after `parse_trial_balance_report`:

```python
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
    col = _gl_column_index(report)
    klass_idx = col.get("klass_name")
    dept_idx = col.get("dept_name")
    out: list[dict[str, Any]] = []

    def cell(cols: list[dict[str, Any]], idx: int | None) -> str:
        if idx is None or idx >= len(cols):
            return ""
        return (cols[idx].get("value") or "").strip()

    def walk(rows: list[dict[str, Any]], account_id: str, account_name: str):
        for row in rows:
            header = row.get("Header")
            if row.get("type") == "Section" and header and header.get("ColData"):
                hcols = header["ColData"]
                acct_name = (hcols[0].get("value") or "").strip()
                acct_id = (hcols[0].get("id") or "").strip()
                nested = row.get("Rows", {}).get("Row", [])
                walk(nested, acct_id or account_id, acct_name or account_name)
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py::test_parse_general_ledger_flattens_account_class_location -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/integrations/quickbooks/service.py backend/tests/integrations/quickbooks/test_class_location_discovery.py
git commit -m "feat(qbo): parse GeneralLedger report into account/class/location rows"
```

---

## Task 3: Discover per-account tags + observed pairs

`discover_class_location_tags` turns parsed GL rows into: per-account class/location sets, observed (class, location) pairs (lines with **both** present), and the global class/location sets. Account numbers are resolved via the `accounts_by_id` metadata map (same trick the TB parser uses), falling back to the GL account id.

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py`
- Test: `backend/tests/integrations/quickbooks/test_class_location_discovery.py`

- [ ] **Step 1: Write the failing test**

Append to `test_class_location_discovery.py`:

```python
from app.integrations.quickbooks.service import discover_class_location_tags


def test_discover_builds_sets_and_observed_pairs():
    accounts_by_id = {
        "33": {"Id": "33", "AcctNum": "4000"},
        "44": {"Id": "44", "AcctNum": "6000"},
    }
    result = discover_class_location_tags(_GL_REPORT, accounts_by_id)
    by_acct = result["by_account"]
    assert by_acct["4000"]["classes"] == {"East", "West"}
    assert by_acct["4000"]["locations"] == {"Montreal"}
    assert by_acct["6000"]["classes"] == set()
    assert by_acct["6000"]["locations"] == {"Quebec"}
    # observed pair requires BOTH class and location on the same line
    assert ("East", "Montreal") in result["observed_pairs"]
    assert ("West", "") not in result["observed_pairs"]
    assert result["classes"] == {"East", "West"}
    assert result["locations"] == {"Montreal", "Quebec"}


def test_discover_falls_back_to_account_id_when_no_acctnum():
    result = discover_class_location_tags(_GL_REPORT, accounts_by_id={})
    # No AcctNum metadata → keyed by GL account id
    assert "33" in result["by_account"]
    assert result["by_account"]["33"]["classes"] == {"East", "West"}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py -k discover -v`
Expected: FAIL with `ImportError: cannot import name 'discover_class_location_tags'`.

- [ ] **Step 3: Implement discovery**

In `backend/app/integrations/quickbooks/service.py`, add after `_parse_general_ledger`:

```python
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py -k discover -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/app/integrations/quickbooks/service.py backend/tests/integrations/quickbooks/test_class_location_discovery.py
git commit -m "feat(qbo): derive per-account class/location tags + observed pairs"
```

---

## Task 4: Best-effort discovery runner + tag-merge helper

A single entry point fetches preferences (optimization) + GL, parses, and returns the discovery structure — wrapped so any failure yields empty discovery (never blocks import). `_merge_tag_csv` produces the union default shown in the preview.

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py`
- Test: `backend/tests/integrations/quickbooks/test_class_location_discovery.py`

- [ ] **Step 1: Write the failing tests**

Append to `test_class_location_discovery.py`:

```python
from app.integrations.quickbooks.service import _merge_tag_csv, run_class_location_discovery


def test_merge_tag_csv_unions_and_sorts():
    assert _merge_tag_csv("West, East", ["East", "North"]) == ["East", "North", "West"]
    assert _merge_tag_csv(None, ["Solo"]) == ["Solo"]
    assert _merge_tag_csv("  ", []) == []
    assert _merge_tag_csv("A,A,B", ["B"]) == ["A", "B"]


@respx.mock
def test_run_discovery_is_best_effort_on_gl_failure(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    base = settings.intuit_api_base
    respx.get(f"{base}/v3/company/realm-1/preferences").mock(
        return_value=Response(200, json={"Preferences": {}})
    )
    respx.get(f"{base}/v3/company/realm-1/reports/GeneralLedger").mock(
        return_value=Response(500)
    )
    accounts_by_id = {"33": {"Id": "33", "AcctNum": "4000"}}
    result = run_class_location_discovery(db, conn, company, 2024, [3], accounts_by_id)
    assert result == service._empty_discovery()


@respx.mock
def test_run_discovery_parses_when_gl_ok(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    base = settings.intuit_api_base
    respx.get(f"{base}/v3/company/realm-1/preferences").mock(
        return_value=Response(200, json={"Preferences": {
            "AccountingInfoPrefs": {"ClassTrackingPerTxn": True, "TrackDepartments": True}
        }})
    )
    respx.get(f"{base}/v3/company/realm-1/reports/GeneralLedger").mock(
        return_value=Response(200, json=_GL_REPORT)
    )
    accounts_by_id = {"33": {"Id": "33", "AcctNum": "4000"}, "44": {"Id": "44", "AcctNum": "6000"}}
    result = run_class_location_discovery(db, conn, company, 2024, [3], accounts_by_id)
    assert result["classes"] == {"East", "West"}
    assert ("East", "Montreal") in result["observed_pairs"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py -k "merge or run_discovery" -v`
Expected: FAIL with `ImportError: cannot import name '_merge_tag_csv'`.

- [ ] **Step 3: Implement the helpers**

In `backend/app/integrations/quickbooks/service.py`, add after `discover_class_location_tags`:

```python
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py -k "merge or run_discovery" -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/app/integrations/quickbooks/service.py backend/tests/integrations/quickbooks/test_class_location_discovery.py
git commit -m "feat(qbo): best-effort class/location discovery runner + tag merge"
```

---

## Task 5: Wire discovery into the preview (`propose_trial_balance`)

The preview attaches `discovered_divisions`/`discovered_sub_divisions` and the merged editable `divisions`/`sub_divisions` to each row, plus top-level `observed_pairs` and `class_location_tracking` (derived from discovered data, not Preferences).

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py` (`propose_trial_balance`)
- Test: `backend/tests/integrations/quickbooks/test_class_location_discovery.py`

- [ ] **Step 1: Write the failing test**

Append to `test_class_location_discovery.py`:

```python
from app.models.account_mapping import AccountMapping


@respx.mock
def test_propose_attaches_merged_tags(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    # existing manual tag on account 4000 to prove the merge (union)
    db.add(AccountMapping(
        company_id=company.id, account_number="4000",
        description="Sales", divisions="Legacy", sub_divisions=None,
    ))
    db.commit()
    base = settings.intuit_api_base
    respx.get(f"{base}/v3/company/realm-1/query").mock(return_value=Response(200, json={
        "QueryResponse": {"Account": [
            {"Id": "33", "AcctNum": "4000", "Name": "Sales",
             "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Id": "44", "AcctNum": "6000", "Name": "Rent", "AccountType": "Expense"},
        ]}
    }))
    respx.get(f"{base}/v3/company/realm-1/reports/TrialBalance").mock(
        return_value=Response(200, json={"Rows": {"Row": [
            {"ColData": [{"value": "Sales (4000)", "id": "33"}, {"value": "0"}, {"value": "150"}]},
            {"ColData": [{"value": "Rent (6000)", "id": "44"}, {"value": "900"}, {"value": "0"}]},
        ]}}))
    respx.get(f"{base}/v3/company/realm-1/preferences").mock(
        return_value=Response(200, json={"Preferences": {}}))
    respx.get(f"{base}/v3/company/realm-1/reports/GeneralLedger").mock(
        return_value=Response(200, json=_GL_REPORT))

    result = service.propose_trial_balance(db, conn, company, 2024, [3])
    rows = {r["account_number"]: r for r in result["rows"]}
    assert rows["4000"]["discovered_divisions"] == ["East", "West"]
    assert rows["4000"]["divisions"] == ["East", "Legacy", "West"]  # merged + sorted
    assert rows["4000"]["sub_divisions"] == ["Montreal"]
    assert result["class_location_tracking"] == {"classes": True, "locations": True}
    assert {"division": "East", "sub_division": "Montreal"} in result["observed_pairs"]
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py::test_propose_attaches_merged_tags -v`
Expected: FAIL with `KeyError: 'discovered_divisions'`.

- [ ] **Step 3: Modify `propose_trial_balance`**

In `backend/app/integrations/quickbooks/service.py`, inside `propose_trial_balance`, **after** the `union` dict is fully built and **before** the `existing_months` query, insert:

```python
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
```

Then change the `return` statement of `propose_trial_balance` to include the two new top-level keys:

```python
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py::test_propose_attaches_merged_tags -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/integrations/quickbooks/service.py backend/tests/integrations/quickbooks/test_class_location_discovery.py
git commit -m "feat(qbo): attach merged class/location tags to TB preview"
```

---

## Task 6: Wire discovery into the commit (`commit_trial_balance`)

On commit: write the user-approved `divisions`/`sub_divisions` (joined CSV) onto each `AccountMapping`, and upsert `Division` per committed class name + `SubDivision` per observed (class, location) pair — additively, idempotently, inside the existing transaction.

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py` (`commit_trial_balance`)
- Test: `backend/tests/integrations/quickbooks/test_class_location_discovery.py`

- [ ] **Step 1: Write the failing test**

Append to `test_class_location_discovery.py`:

```python
from app.models.company import Division, SubDivision


def _commit_mocks(base):
    respx.get(f"{base}/v3/company/realm-1/query").mock(return_value=Response(200, json={
        "QueryResponse": {"Account": [
            {"Id": "33", "AcctNum": "4000", "Name": "Sales", "AccountType": "Income"},
            {"Id": "44", "AcctNum": "6000", "Name": "Rent", "AccountType": "Expense"},
        ]}
    }))
    respx.get(f"{base}/v3/company/realm-1/reports/TrialBalance").mock(
        return_value=Response(200, json={"Rows": {"Row": [
            {"ColData": [{"value": "Sales (4000)", "id": "33"}, {"value": "0"}, {"value": "150"}]},
            {"ColData": [{"value": "Rent (6000)", "id": "44"}, {"value": "900"}, {"value": "0"}]},
        ]}}))
    respx.get(f"{base}/v3/company/realm-1/preferences").mock(
        return_value=Response(200, json={"Preferences": {}}))
    respx.get(f"{base}/v3/company/realm-1/reports/GeneralLedger").mock(
        return_value=Response(200, json=_GL_REPORT))


@respx.mock
def test_commit_writes_tags_and_creates_division_tree(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    _commit_mocks(settings.intuit_api_base)
    rows = [
        {"account_number": "4000", "account_name": "Sales", "link_code": "REV",
         "skip": False, "divisions": ["East", "West"], "sub_divisions": ["Montreal"]},
        {"account_number": "6000", "account_name": "Rent", "link_code": "EXP",
         "skip": False, "divisions": [], "sub_divisions": ["Quebec"]},
    ]
    # bypass link-code validation by seeding a structure with REV/EXP
    from app.models.financial_statement_mapping import CompanyStatementStructure
    db.add(CompanyStatementStructure(
        company_id=company.id, statement_type="income_statement",
        structure=[{"label": "Rev", "linkCode": "REV"}, {"label": "Exp", "linkCode": "EXP"}],
    ))
    db.commit()

    service.commit_trial_balance(db, conn, company, 2024, [3], rows, overwrite=False)

    m4000 = db.query(AccountMapping).filter_by(company_id=company.id, account_number="4000").one()
    assert m4000.divisions == "East, West"
    assert m4000.sub_divisions == "Montreal"
    divs = {d.name: d for d in db.query(Division).filter_by(company_id=company.id).all()}
    assert "East" in divs and "West" in divs
    montreal = db.query(SubDivision).filter_by(division_id=divs["East"].id, name="Montreal").all()
    assert len(montreal) == 1


@respx.mock
def test_commit_division_tree_is_idempotent(db, org_user_company):
    _, user, company = org_user_company
    conn = _make_conn(db, company, user)
    from app.models.financial_statement_mapping import CompanyStatementStructure
    db.add(CompanyStatementStructure(
        company_id=company.id, statement_type="income_statement",
        structure=[{"label": "Rev", "linkCode": "REV"}, {"label": "Exp", "linkCode": "EXP"}],
    ))
    db.commit()
    rows = [
        {"account_number": "4000", "account_name": "Sales", "link_code": "REV",
         "skip": False, "divisions": ["East"], "sub_divisions": ["Montreal"]},
        {"account_number": "6000", "account_name": "Rent", "link_code": "EXP",
         "skip": False, "divisions": [], "sub_divisions": []},
    ]
    _commit_mocks(settings.intuit_api_base)  # respx routes are reusable across calls
    service.commit_trial_balance(db, conn, company, 2024, [3], rows, overwrite=True)
    service.commit_trial_balance(db, conn, company, 2024, [3], rows, overwrite=True)
    assert db.query(Division).filter_by(company_id=company.id, name="East").count() == 1
    east = db.query(Division).filter_by(company_id=company.id, name="East").one()
    assert db.query(SubDivision).filter_by(division_id=east.id, name="Montreal").count() == 1
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py -k commit -v`
Expected: FAIL — `AccountMapping.divisions` is `None` (tags not written) / `Division` rows absent.

- [ ] **Step 3: Add the tree-upsert helper**

In `backend/app/integrations/quickbooks/service.py`, add near the other module helpers (above `commit_trial_balance`):

```python
def _upsert_division_tree(
    db: Session,
    company: Company,
    class_names: set[str],
    observed_pairs: set[tuple[str, str]],
) -> None:
    """Additively upsert Division (per class) + SubDivision (per observed pair).

    Never deletes — protects manually created divisions. Idempotent.
    """
    from app.models.company import Division, SubDivision

    divisions = {
        d.name: d
        for d in db.query(Division).filter(Division.company_id == company.id).all()
    }
    for name in class_names:
        if name not in divisions:
            div = Division(company_id=company.id, name=name)
            db.add(div)
            db.flush()
            divisions[name] = div

    existing_subs = {
        (s.division_id, s.name)
        for s in db.query(SubDivision)
        .join(Division, SubDivision.division_id == Division.id)
        .filter(Division.company_id == company.id)
        .all()
    }
    for cls, loc in observed_pairs:
        div = divisions.get(cls)
        if div is None:
            continue  # only nest under classes the user kept
        if (div.id, loc) not in existing_subs:
            db.add(SubDivision(division_id=div.id, name=loc))
            existing_subs.add((div.id, loc))
```

- [ ] **Step 4: Modify `commit_trial_balance`**

In `commit_trial_balance`, the row loop that upserts `AccountMapping` currently sets `description` and `link_code`. Update both the create and update branches to also write the tag CSVs. Replace the `AccountMapping` create call:

```python
        if existing is None:
            db.add(AccountMapping(
                company_id=company.id,
                account_number=acct_num,
                description=acct_name,
                link_code=link_code,
                divisions=", ".join(r.get("divisions") or []) or None,
                sub_divisions=", ".join(r.get("sub_divisions") or []) or None,
            ))
            mappings_created += 1
        else:
            new_divisions = ", ".join(r.get("divisions") or []) or None
            new_sub_divisions = ", ".join(r.get("sub_divisions") or []) or None
            if (
                existing.link_code != link_code
                or existing.description != acct_name
                or existing.divisions != new_divisions
                or existing.sub_divisions != new_sub_divisions
            ):
                existing.link_code = link_code
                existing.description = acct_name
                existing.divisions = new_divisions
                existing.sub_divisions = new_sub_divisions
                mappings_updated += 1
```

Then, **after** the TrialBalanceEntry insertion loop and **before** `db.commit()`, insert the tree build (re-running discovery best-effort for observed pairs):

```python
    # Build Division/SubDivision selector tree from observed (class, location) pairs.
    class_names: set[str] = set()
    for r in rows:
        if r.get("skip"):
            continue
        class_names.update(t for t in (r.get("divisions") or []) if t)
    if class_names:
        discovery = run_class_location_discovery(
            db, conn, company, fiscal_year, months, accounts_by_id
        )
        _upsert_division_tree(db, company, class_names, discovery["observed_pairs"])
```

Note: `accounts_by_id` is already built earlier in `commit_trial_balance` (the re-pull block) and is in scope.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_class_location_discovery.py -k commit -v`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full QBO suite for regressions**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/ -v`
Expected: PASS (all existing + new).

- [ ] **Step 7: Commit**

```bash
git add backend/app/integrations/quickbooks/service.py backend/tests/integrations/quickbooks/test_class_location_discovery.py
git commit -m "feat(qbo): write class/location tags + build division tree on commit"
```

---

## Task 7: Schemas + router wiring

Expose the new fields through the Pydantic layer so the API serializes them and accepts edited tags on commit. All new fields default-valued so existing clients/tests keep working.

**Files:**
- Modify: `backend/app/schemas/quickbooks.py`
- Modify: `backend/app/integrations/quickbooks/router.py`
- Test: `backend/tests/integrations/quickbooks/test_router.py` (add one assertion-style test)

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/integrations/quickbooks/test_router.py` (reuse its existing fixtures/mocks style — this test mocks at the service layer to stay focused on serialization):

```python
def test_preview_response_includes_tracking_and_tags(auth_client, db, org_user_company, monkeypatch):
    from app.integrations.quickbooks import oauth
    from app.integrations.quickbooks import service as svc
    _, user, company = org_user_company
    svc.upsert_connection(
        db, company.id, "realm-1",
        oauth.TokenResponse(
            access_token="AT", refresh_token="RT",
            expires_in=3600, x_refresh_token_expires_in=8640000,
        ),
        user.id,
    )

    def fake_propose(db_, conn_, company_, fy, months):
        return {
            "currency": "CAD",
            "existing_months": [],
            "rows": [{
                "qbo_account_id": "33", "account_number": "4000", "account_name": "Sales",
                "qbo_account_type": "Income", "qbo_account_sub_type": None,
                "existing_link_code": None, "monthly_amounts": {},
                "discovered_divisions": ["East"], "discovered_sub_divisions": ["Montreal"],
                "divisions": ["East"], "sub_divisions": ["Montreal"],
            }],
            "observed_pairs": [{"division": "East", "sub_division": "Montreal"}],
            "class_location_tracking": {"classes": True, "locations": True},
        }
    monkeypatch.setattr(svc, "propose_trial_balance", fake_propose)

    resp = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2024, "months": [3]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["class_location_tracking"] == {"classes": True, "locations": True}
    assert body["rows"][0]["divisions"] == ["East"]
    assert body["observed_pairs"] == [{"division": "East", "sub_division": "Montreal"}]
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py::test_preview_response_includes_tracking_and_tags -v`
Expected: FAIL — `class_location_tracking` not in response (and/or pydantic ignores unknown keys).

- [ ] **Step 3: Update schemas**

In `backend/app/schemas/quickbooks.py`:

Add a small model and extend the row + response + commit-row models:

```python
class ObservedPair(BaseModel):
    division: str
    sub_division: str


class ClassLocationTracking(BaseModel):
    classes: bool = False
    locations: bool = False
```

Extend `TrialBalanceRowProposal` with:

```python
    discovered_divisions: list[str] = []
    discovered_sub_divisions: list[str] = []
    divisions: list[str] = []
    sub_divisions: list[str] = []
```

Extend `TrialBalancePreviewResponse` with:

```python
    observed_pairs: list[ObservedPair] = []
    class_location_tracking: ClassLocationTracking = ClassLocationTracking()
```

Extend `TrialBalanceCommitRow` with:

```python
    divisions: list[str] = []
    sub_divisions: list[str] = []
```

- [ ] **Step 4: Update the preview endpoint**

In `backend/app/integrations/quickbooks/router.py`, update the imports from `app.schemas.quickbooks` to add `ClassLocationTracking` and `ObservedPair`, then change the `preview_trial_balance` return to pass the new fields:

```python
    return TrialBalancePreviewResponse(
        fiscal_year=body.fiscal_year,
        months=months,
        currency=result["currency"],
        fetched_at=datetime.now(timezone.utc),
        existing_months=result["existing_months"],
        rows=[TrialBalanceRowProposal(**r) for r in result["rows"]],
        observed_pairs=[ObservedPair(**p) for p in result.get("observed_pairs", [])],
        class_location_tracking=ClassLocationTracking(
            **result.get("class_location_tracking", {})
        ),
    )
```

(The commit endpoint already does `[r.model_dump() for r in body.rows]`, so the new `divisions`/`sub_divisions` flow through with no change.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py::test_preview_response_includes_tracking_and_tags -v`
Expected: PASS.

- [ ] **Step 6: Run the full backend test suite**

Run: `cd backend && python -m pytest -q`
Expected: PASS (no regressions).

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/quickbooks.py backend/app/integrations/quickbooks/router.py backend/tests/integrations/quickbooks/test_router.py
git commit -m "feat(qbo): expose class/location tags + tracking flags via API"
```

---

## Task 8: Frontend API types

Extend the QBO TypeScript types so the preview surfaces the new fields and the commit sends edited tags.

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Extend the proposal row type**

In `frontend/lib/api.ts`, update `QboTrialBalanceProposalRow` to add:

```typescript
  discovered_divisions: string[]
  discovered_sub_divisions: string[]
  divisions: string[]
  sub_divisions: string[]
```

- [ ] **Step 2: Extend the preview + commit types**

Update `QboTrialBalancePreview` to add:

```typescript
  observed_pairs: { division: string; sub_division: string }[]
  class_location_tracking: { classes: boolean; locations: boolean }
```

Update `QboCommitRow` to add:

```typescript
  divisions?: string[]
  sub_divisions?: string[]
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && pnpm exec tsc --noEmit`
Expected: PASS (these are additive optional/array fields; no call sites break yet).

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(qbo): add class/location fields to frontend QBO types"
```

---

## Task 9: Tag-cell editor component

A small, focused multi-value chip editor reused for both the Division and Sous-division cells. Built from existing primitives (Popover + Command + Badge), no new dependency.

**Files:**
- Create: `frontend/components/quickbooks-tag-cell.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/components/quickbooks-tag-cell.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TagCellProps {
  values: string[]
  /** Known options offered in the picker (union of discovered values). */
  options: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export function QuickBooksTagCell({
  values,
  options,
  onChange,
  placeholder = "Add…",
}: TagCellProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const add = (raw: string) => {
    const v = raw.trim()
    if (!v || values.includes(v)) return
    onChange([...values, v].sort())
    setQuery("")
  }
  const remove = (v: string) => onChange(values.filter((x) => x !== v))

  const suggestions = options.filter((o) => !values.includes(o))

  return (
    <div className="flex flex-wrap items-center gap-1">
      {values.map((v) => (
        <Badge key={v} variant="secondary" className="gap-1 text-xs">
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            onClick={() => remove(v)}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1 text-xs text-muted-foreground"
            aria-label="Add tag"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {query.trim() ? (
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent"
                    onClick={() => {
                      add(query)
                      setOpen(false)
                    }}
                  >
                    Add &quot;{query.trim()}&quot;
                  </button>
                ) : (
                  "No options"
                )}
              </CommandEmpty>
              {suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((o) => (
                    <CommandItem
                      key={o}
                      value={o}
                      onSelect={() => {
                        add(o)
                        setOpen(false)
                      }}
                    >
                      {o}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/quickbooks-tag-cell.tsx
git commit -m "feat(qbo): add multi-value tag-cell editor component"
```

---

## Task 10: Render Division/Sous-division columns in the review table

Wire the new columns into `QuickBooksReviewTable`: extend `RowState`, seed from the preview's merged values, render the two columns only when tracking is on, and include the arrays in the commit payload.

**Files:**
- Modify: `frontend/components/quickbooks-review-table.tsx`

- [ ] **Step 1: Extend imports + RowState**

In `frontend/components/quickbooks-review-table.tsx`:

Add to the `@/lib/api` import list: nothing new needed (types already extended). Add the component import near the other component imports:

```tsx
import { QuickBooksTagCell } from "@/components/quickbooks-tag-cell"
```

Extend the `RowState` type with:

```tsx
  divisions: string[]
  sub_divisions: string[]
```

Extend the initial `useState(() => preview.rows.map(...))` row mapping with:

```tsx
      divisions: r.divisions ?? [],
      sub_divisions: r.sub_divisions ?? [],
```

- [ ] **Step 2: Derive tracking flags + option lists**

Just after the `rows` state is declared, add:

```tsx
  const showDivisions = preview.class_location_tracking?.classes ?? false
  const showSubDivisions = preview.class_location_tracking?.locations ?? false

  const divisionOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of preview.rows) for (const d of r.discovered_divisions ?? []) s.add(d)
    return Array.from(s).sort()
  }, [preview.rows])

  const subDivisionOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of preview.rows) for (const d of r.discovered_sub_divisions ?? []) s.add(d)
    return Array.from(s).sort()
  }, [preview.rows])
```

- [ ] **Step 3: Add the column headers**

In the `<TableHeader>` row, immediately **before** `<TableHead className="w-[260px]">Link code</TableHead>`, add:

```tsx
                {showDivisions && (
                  <TableHead className="w-[180px]">Division</TableHead>
                )}
                {showSubDivisions && (
                  <TableHead className="w-[180px]">Sous-division</TableHead>
                )}
```

- [ ] **Step 4: Add the body cells**

In the `<TableBody>` row, immediately **before** the `<TableCell>` that contains `<LinkCodePicker ...>`, add:

```tsx
                    {showDivisions && (
                      <TableCell>
                        <QuickBooksTagCell
                          values={r.divisions}
                          options={divisionOptions}
                          onChange={(next) => updateRow(idx, { divisions: next })}
                          placeholder="Division…"
                        />
                      </TableCell>
                    )}
                    {showSubDivisions && (
                      <TableCell>
                        <QuickBooksTagCell
                          values={r.sub_divisions}
                          options={subDivisionOptions}
                          onChange={(next) => updateRow(idx, { sub_divisions: next })}
                          placeholder="Sous-division…"
                        />
                      </TableCell>
                    )}
```

- [ ] **Step 5: Include tags in the commit payload**

In `doCommit`, update the `payload` mapping to include the tag arrays:

```tsx
      const payload: QboCommitRow[] = rows.map((r) => ({
        account_number: r.account_number,
        account_name: r.account_name,
        link_code: r.link_code,
        skip: r.skip,
        divisions: r.divisions,
        sub_divisions: r.sub_divisions,
      }))
```

- [ ] **Step 6: Type-check + build**

Run: `cd frontend && pnpm exec tsc --noEmit && pnpm build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/quickbooks-review-table.tsx
git commit -m "feat(qbo): show editable Division/Sous-division columns in review table"
```

---

## Task 11: Frontend e2e coverage

Add Playwright coverage to `frontend/e2e/quickbooks.spec.ts`: a preview mock that returns discovered tags renders the columns and lets the user add/remove a chip, and the commit request carries the edited arrays; a tracking-off mock hides the columns.

**Files:**
- Modify: `frontend/e2e/quickbooks.spec.ts`

- [ ] **Step 1: Read the existing spec to match its mocking style**

Run: open `frontend/e2e/quickbooks.spec.ts` and note how it mocks `**/trial-balance/preview` and `**/trial-balance/commit` and how it navigates to the review table. Match the existing route-mock helpers and selectors.

- [ ] **Step 2: Add the columns-visible test**

Append a test that mocks the preview response (reusing the file's existing connected-state setup) with:

```typescript
// inside the preview mock JSON body:
class_location_tracking: { classes: true, locations: true },
observed_pairs: [{ division: "East", sub_division: "Montreal" }],
rows: [
  {
    qbo_account_id: "33", account_number: "4000", account_name: "Sales",
    qbo_account_type: "Income", qbo_account_sub_type: null,
    existing_link_code: null, monthly_amounts: { "3": { debit: 0, credit: 150 } },
    discovered_divisions: ["East"], discovered_sub_divisions: ["Montreal"],
    divisions: ["East"], sub_divisions: ["Montreal"],
  },
],
```

Then assert:

```typescript
await expect(page.getByRole("columnheader", { name: "Division" })).toBeVisible()
await expect(page.getByRole("columnheader", { name: "Sous-division" })).toBeVisible()
await expect(page.getByText("East", { exact: true })).toBeVisible()
```

- [ ] **Step 3: Add the edit-and-commit assertion**

In the same test, capture the commit request body and assert the edited tags are sent. Using the existing commit-mock pattern, intercept the request:

```typescript
let committedBody: any = null
await page.route("**/trial-balance/commit", async (route) => {
  committedBody = route.request().postDataJSON()
  await route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({
      months_imported: 1, accounts_imported: 1,
      mappings_created: 1, mappings_updated: 0,
    }),
  })
})

// remove the "East" chip, then import
await page.getByRole("button", { name: "Remove East" }).click()
await page.getByRole("button", { name: /^Import/ }).click()

await expect.poll(() => committedBody?.rows?.[0]?.divisions).toEqual([])
await expect.poll(() => committedBody?.rows?.[0]?.sub_divisions).toEqual(["Montreal"])
```

(Pick the link-code for the row first if the existing spec requires a valid link code before Import is enabled — follow the file's existing pattern for making a row committable.)

- [ ] **Step 4: Add the tracking-off test**

Add a second test whose preview mock sets `class_location_tracking: { classes: false, locations: false }` and `discovered_*: []`, then assert:

```typescript
await expect(page.getByRole("columnheader", { name: "Division" })).toHaveCount(0)
await expect(page.getByRole("columnheader", { name: "Sous-division" })).toHaveCount(0)
```

- [ ] **Step 5: Run the e2e spec**

Run: `cd frontend && pnpm test:e2e quickbooks.spec.ts`
Expected: PASS (requires the app per the file's existing setup; follow its conventions).

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e/quickbooks.spec.ts
git commit -m "test(qbo): e2e for editable Division/Sous-division columns"
```

---

## Task 12: Update CLAUDE.md

Document the new behavior in the QuickBooks integration section per the project's "UPDATE YOUR CLAUDE.MD FILE WHEN NEEDED" rule.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a bullet to the QuickBooks Online integration section**

Under "## QuickBooks Online integration", add:

```markdown
- **Class/Location tagging:** preview/commit also pull a GeneralLedger report to
  discover which QBO Classes (→ `AccountMapping.divisions`) and Locations/Lieux
  (→ `AccountMapping.sub_divisions`) each account appears under. The preview
  merges discovered values with existing tags (union) and shows them as editable
  chips; commit writes the CSV and additively upserts `Division`/`SubDivision`
  rows for observed (class, location) pairs. Discovery is best-effort — GL/prefs
  failures degrade to empty tags and never block the TB import. Tracking-on flags
  are derived from discovered data, not Preferences.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document QBO class/location tagging in CLAUDE.md"
```

---

## Final verification

- [ ] **Backend:** `cd backend && python -m pytest -q` → all pass.
- [ ] **Frontend types/build:** `cd frontend && pnpm exec tsc --noEmit && pnpm build` → pass.
- [ ] **Frontend e2e:** `cd frontend && pnpm test:e2e quickbooks.spec.ts` → pass.
- [ ] **Manual smoke (optional):** connect a QBO sandbox company with class+location tracking, run a preview, confirm Division/Sous-division columns populate, edit a chip, commit, and verify the EntitySelector on a financial statement shows the new Division → SubDivision tree.
