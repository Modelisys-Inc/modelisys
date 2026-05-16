# QBO Multi-Month Trial Balance Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users import a contiguous range of months within one fiscal year from QuickBooks Online in one flow — pull each month's TB, review mappings once across the union of accounts, commit atomically.

**Architecture:** Backend preview/commit endpoints take `months: list[int]` instead of a single `month: int`. Preview iterates QBO TB pulls (one per month) and returns a union of accounts with sparse `monthly_amounts`. Commit re-pulls QBO for every month, validates link codes, detects account drift, and writes everything in a single transaction. Frontend gains start/end month inputs and a review table that shows per-month amount columns (collapsing to a single column for ranges > 6 months).

**Tech Stack:** Backend: FastAPI 0.115, Pydantic v2, SQLAlchemy 2.0, pytest, respx. Frontend: Next.js 16, React 19, TypeScript 5, Playwright.

---

## File Structure

**Backend — modify:**
- `backend/app/schemas/quickbooks.py` — replace single-month request/response models with multi-month versions; add `monthly_amounts` and `existing_months` fields.
- `backend/app/integrations/quickbooks/service.py` — refactor `propose_trial_balance` and `commit_trial_balance` to accept `months: list[int]`; add data-drift detection.
- `backend/app/integrations/quickbooks/router.py` — update `/preview` and `/commit` endpoints; validate `months` list.

**Backend — test:**
- `backend/tests/integrations/quickbooks/test_router.py` — replace single-month tests with multi-month coverage.

**Frontend — modify:**
- `frontend/lib/api.ts` — update `QboTrialBalancePreview`, `QboTrialBalanceProposalRow`, `previewQboTrialBalance`, `commitQboTrialBalance`.
- `frontend/app/settings/companies/[id]/quickbooks/page.tsx` — replace single month input with start/end month inputs; send `months` list.
- `frontend/components/quickbooks-review-table.tsx` — accept multi-month preview; render per-month columns or collapsed summary; range header; overwrite-banner months.

**Frontend — test:**
- `frontend/e2e/quickbooks.spec.ts` — update existing tests to multi-month shape; add range-conflict and wide-range tests.

**Docs — modify:**
- `docs/quickbooks-release-checklist.md` — update example request payloads.

---

## Task 1: Update Pydantic schemas

**Files:**
- Modify: `backend/app/schemas/quickbooks.py`

This task changes the request/response shapes. Subsequent tasks won't compile until later code is updated, but that's expected — we land everything in the same PR.

- [ ] **Step 1: Replace the trial-balance schemas**

Replace the existing single-month schemas (`TrialBalanceRowProposal`, `TrialBalancePreviewRequest`, `TrialBalancePreviewResponse`, `TrialBalanceCommitRow`, `TrialBalanceCommitRequest`, `TrialBalanceCommitResponse`) with these multi-month versions:

```python
class MonthAmount(BaseModel):
    debit: float
    credit: float


class TrialBalanceRowProposal(BaseModel):
    qbo_account_id: str
    account_number: str
    account_name: str
    qbo_account_type: str | None = None
    qbo_account_sub_type: str | None = None
    existing_link_code: str | None = None
    monthly_amounts: dict[str, MonthAmount]


class TrialBalancePreviewRequest(BaseModel):
    fiscal_year: int
    months: list[int]


class TrialBalancePreviewResponse(BaseModel):
    fiscal_year: int
    months: list[int]
    currency: str
    fetched_at: datetime
    existing_months: list[int]
    rows: list[TrialBalanceRowProposal]


class TrialBalanceCommitRow(BaseModel):
    account_number: str
    account_name: str
    link_code: str | None = None
    skip: bool = False


class TrialBalanceCommitRequest(BaseModel):
    fiscal_year: int
    months: list[int]
    rows: list[TrialBalanceCommitRow]
    overwrite_existing_tb: bool = False


class TrialBalanceCommitResponse(BaseModel):
    months_imported: int
    accounts_imported: int
    mappings_created: int
    mappings_updated: int
```

Notes for the engineer:
- `monthly_amounts` is keyed by month-as-string (e.g. `"1"`, `"6"`). JSON object keys must be strings; we don't use int keys.
- `TrialBalanceCommitRow` no longer carries `debit`/`credit` — the server re-pulls amounts from QBO on commit.

- [ ] **Step 2: Verify the schema file imports cleanly**

Run from the `backend/` directory:

```bash
python -c "from app.schemas import quickbooks; print('ok')"
```

Expected output: `ok` (and nothing else).

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/quickbooks.py
git commit -m "refactor(qbo): switch trial balance schemas to multi-month shape"
```

---

## Task 2: Service layer — preview union of accounts across months

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py:196-233` (replace `propose_trial_balance`)

- [ ] **Step 1: Write a failing test for multi-month preview union**

Add this test to `backend/tests/integrations/quickbooks/test_router.py` (replacing or alongside `test_preview_happy_path`):

```python
@respx.mock
def test_preview_multi_month_returns_union_with_sparse_amounts(
    auth_client, db, org_user_company,
):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)

    fixture = json.loads(FIXTURE.read_text())
    # Same fixture for both calls — proves union dedupes rows.
    respx.get(
        "https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/reports/TrialBalance"
    ).mock(return_value=Response(200, json=fixture))
    respx.get(
        "https://sandbox-quickbooks.api.intuit.com/v3/company/realm-1/query"
    ).mock(return_value=Response(200, json={"QueryResponse": {"Account": [
        {"Id": "1", "AcctNum": "1000", "AccountType": "Bank",
         "AccountSubType": "Checking"},
        {"Id": "42", "AcctNum": "4000", "AccountType": "Income",
         "AccountSubType": "SalesOfProductIncome"},
        {"Id": "60", "AcctNum": "6010", "AccountType": "Expense",
         "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
    ]}}))

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [1, 2, 3]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["months"] == [1, 2, 3]
    assert body["existing_months"] == []
    assert len(body["rows"]) == 3  # union, deduped by account_number
    cash = next(r for r in body["rows"] if r["account_number"] == "1000")
    # All three months hit the same fixture, so all three appear.
    assert set(cash["monthly_amounts"].keys()) == {"1", "2", "3"}
    assert cash["monthly_amounts"]["1"]["debit"] > 0
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd backend && python -m pytest tests/integrations/quickbooks/test_router.py::test_preview_multi_month_returns_union_with_sparse_amounts -v
```

Expected: FAIL — current preview rejects `months` field (422) or returns rows without `monthly_amounts`.

- [ ] **Step 3: Replace `propose_trial_balance`**

In `backend/app/integrations/quickbooks/service.py`, replace the existing `propose_trial_balance` function (lines ~196-233) with:

```python
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
    }
```

- [ ] **Step 4: Update the router to call the new signature**

Replace the `/preview` endpoint body in `backend/app/integrations/quickbooks/router.py`:

```python
@router.post(
    "/companies/{company_id}/trial-balance/preview",
    response_model=TrialBalancePreviewResponse,
)
def preview_trial_balance(
    company_id: uuid.UUID,
    body: TrialBalancePreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    conn = _require_active_connection(db, company.id)
    months = _validate_months(body.months)
    try:
        result = qbo_service.propose_trial_balance(
            db, conn, company, body.fiscal_year, months,
        )
    except qbo_service.ConnectionRevokedError:
        raise HTTPException(status_code=424, detail="QuickBooks connection revoked")
    except QBOClientError as e:
        sc = e.status_code or 502
        if sc == 429:
            raise HTTPException(status_code=503, detail="QuickBooks is rate-limiting; try again shortly")
        if sc == 504:
            raise HTTPException(status_code=504, detail="QuickBooks request timed out")
        raise HTTPException(status_code=502, detail=f"QuickBooks error: {e}")
    return TrialBalancePreviewResponse(
        fiscal_year=body.fiscal_year,
        months=months,
        currency=result["currency"],
        fetched_at=datetime.now(timezone.utc),
        existing_months=result["existing_months"],
        rows=[TrialBalanceRowProposal(**r) for r in result["rows"]],
    )
```

Add the `_validate_months` helper near the top of the file (below `_require_active_connection`):

```python
def _validate_months(months: list[int]) -> list[int]:
    if not months:
        raise HTTPException(status_code=422, detail="months must not be empty")
    for m in months:
        if not 1 <= m <= 12:
            raise HTTPException(
                status_code=422,
                detail=f"month {m} is out of range [1, 12]",
            )
    return sorted(set(months))
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
cd backend && python -m pytest tests/integrations/quickbooks/test_router.py::test_preview_multi_month_returns_union_with_sparse_amounts -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/integrations/quickbooks/service.py backend/app/integrations/quickbooks/router.py backend/tests/integrations/quickbooks/test_router.py
git commit -m "feat(qbo): preview returns union of accounts across month range"
```

---

## Task 3: Service layer — multi-month commit with re-pull and drift check

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py:236-370` (replace `commit_trial_balance`)

- [ ] **Step 1: Write a failing test for happy-path multi-month commit**

Add to `backend/tests/integrations/quickbooks/test_router.py`. Use the `_seed_legacy_codes_structure` helper that already exists:

```python
@respx.mock
def test_commit_multi_month_writes_entry_per_month(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _seed_legacy_codes_structure(db, company)
    _mock_preview_endpoints()  # same fixture across months

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026,
            "months": [1, 2, 3],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["months_imported"] == 3
    assert body["accounts_imported"] == 2  # unique non-skipped accounts written

    # 2 non-skipped accounts × 3 months = 6 entries
    entries = db.query(TrialBalanceEntry).filter_by(company_id=company.id).all()
    assert len(entries) == 6
    months_written = {e.month for e in entries}
    assert months_written == {1, 2, 3}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd backend && python -m pytest tests/integrations/quickbooks/test_router.py::test_commit_multi_month_writes_entry_per_month -v
```

Expected: FAIL.

- [ ] **Step 3: Replace `commit_trial_balance`**

In `backend/app/integrations/quickbooks/service.py`, replace the existing `commit_trial_balance` function with this version. **Note:** the signature changes — it now needs the connection because it re-pulls QBO data.

```python
class DataDriftError(Exception):
    def __init__(self, new_accounts: list[str]):
        self.new_accounts = new_accounts
        super().__init__(
            "Data drift: new accounts in QBO that were not in preview: "
            + ", ".join(new_accounts)
        )


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
```

- [ ] **Step 4: Update the router to call the new signature and map `DataDriftError` to 409**

Replace the `/commit` endpoint body in `backend/app/integrations/quickbooks/router.py`:

```python
@router.post(
    "/companies/{company_id}/trial-balance/commit",
    response_model=TrialBalanceCommitResponse,
    status_code=201,
)
def commit_trial_balance_endpoint(
    company_id: uuid.UUID,
    body: TrialBalanceCommitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    conn = _require_active_connection(db, company.id)
    months = _validate_months(body.months)
    try:
        result = qbo_service.commit_trial_balance(
            db, conn, company, body.fiscal_year, months,
            [r.model_dump() for r in body.rows], body.overwrite_existing_tb,
        )
    except qbo_service.TBConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except qbo_service.InvalidLinkCodesError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except qbo_service.DataDriftError as e:
        raise HTTPException(
            status_code=409,
            detail=f"Data drift detected, re-preview. New accounts: {', '.join(e.new_accounts)}",
        )
    except qbo_service.ConnectionRevokedError:
        raise HTTPException(status_code=424, detail="QuickBooks connection revoked")
    except QBOClientError as e:
        sc = e.status_code or 502
        if sc == 429:
            raise HTTPException(status_code=503, detail="QuickBooks is rate-limiting; try again shortly")
        if sc == 504:
            raise HTTPException(status_code=504, detail="QuickBooks request timed out")
        raise HTTPException(status_code=502, detail=f"QuickBooks error: {e}")
    return TrialBalanceCommitResponse(**result)
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
cd backend && python -m pytest tests/integrations/quickbooks/test_router.py::test_commit_multi_month_writes_entry_per_month -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/integrations/quickbooks/service.py backend/app/integrations/quickbooks/router.py backend/tests/integrations/quickbooks/test_router.py
git commit -m "feat(qbo): commit accepts months list, re-pulls QBO, detects drift"
```

---

## Task 4: Backend tests for preview edge cases

**Files:**
- Modify: `backend/tests/integrations/quickbooks/test_router.py`

- [ ] **Step 1: Add `existing_months` and validation tests**

Append these tests to `backend/tests/integrations/quickbooks/test_router.py`:

```python
@respx.mock
def test_preview_reports_existing_months(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    # Seed a TB entry for month 2.
    chart = ChartOfAccount(
        company_id=company.id, account_number="1000", account_name="Cash",
    )
    db.add(chart)
    db.flush()
    db.add(TrialBalanceEntry(
        company_id=company.id, account_id=chart.id,
        fiscal_year=2026, month=2, amount=100,
    ))
    db.commit()

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [1, 2, 3]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["existing_months"] == [2]


def test_preview_empty_months_returns_422(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": []},
    )
    assert r.status_code == 422


def test_preview_out_of_range_month_returns_422(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [3, 13]},
    )
    assert r.status_code == 422


@respx.mock
def test_preview_dedupes_and_sorts_months(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _mock_preview_endpoints()
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
        json={"fiscal_year": 2026, "months": [3, 1, 2, 2]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["months"] == [1, 2, 3]
```

- [ ] **Step 2: Remove or update outdated single-month tests**

In the same file, delete the test `test_preview_invalid_month` (line ~242) — it's superseded by `test_preview_out_of_range_month_returns_422`. Update `test_preview_happy_path` (line ~188) and `test_preview_includes_existing_link_code` (line ~203) to send `"months": [3]` instead of `"month": 3`, and assert against `body["rows"][i]["monthly_amounts"]["3"]` rather than top-level `debit`/`credit`:

For `test_preview_happy_path`, replace assertions with:

```python
r = auth_client.post(
    f"/api/quickbooks/companies/{company.id}/trial-balance/preview",
    json={"fiscal_year": 2026, "months": [3]},
)
assert r.status_code == 200, r.text
body = r.json()
assert body["currency"] == "CAD"
assert body["months"] == [3]
assert len(body["rows"]) == 3
cash = next(r for r in body["rows"] if r["account_number"] == "1000")
assert "3" in cash["monthly_amounts"]
```

For `test_preview_includes_existing_link_code`, replace the request body with `{"fiscal_year": 2026, "months": [3]}`.

Also update `test_preview_revoked_424` and `test_preview_qbo_429_maps_to_503` to use `"months": [3]`.

- [ ] **Step 3: Run all preview tests**

```bash
cd backend && python -m pytest tests/integrations/quickbooks/test_router.py -k preview -v
```

Expected: all preview tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/integrations/quickbooks/test_router.py
git commit -m "test(qbo): cover preview existing_months, validation, dedup"
```

---

## Task 5: Backend tests for commit edge cases

**Files:**
- Modify: `backend/tests/integrations/quickbooks/test_router.py`

- [ ] **Step 1: Add new commit tests**

Append these to `backend/tests/integrations/quickbooks/test_router.py`:

```python
@respx.mock
def test_commit_multi_month_conflict_without_overwrite_writes_nothing(
    auth_client, db, org_user_company,
):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _seed_legacy_codes_structure(db, company)
    _mock_preview_endpoints()

    # First commit succeeds for months 1, 2.
    first = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert first.status_code == 201, first.text
    baseline = db.query(TrialBalanceEntry).filter_by(company_id=company.id).count()

    # Second commit overlaps months 1, 2 — must 409 and not change DB.
    second = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2, 3],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert second.status_code == 409
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == baseline


@respx.mock
def test_commit_overwrite_replaces_conflicting_months_only(
    auth_client, db, org_user_company,
):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _seed_legacy_codes_structure(db, company)
    _mock_preview_endpoints()

    auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": False,
        },
    )

    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2, 3],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
                {"account_number": "4000", "account_name": "Sales",
                 "link_code": "revenus.ventes"},
                {"account_number": "6010", "account_name": "Office",
                 "link_code": None, "skip": True},
            ],
            "overwrite_existing_tb": True,
        },
    )
    assert r.status_code == 201, r.text
    # 2 non-skipped accounts × 3 months = 6 entries (1 and 2 replaced; 3 new).
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 6


@respx.mock
def test_commit_data_drift_returns_409_and_writes_nothing(
    auth_client, db, org_user_company,
):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _seed_legacy_codes_structure(db, company)
    _mock_preview_endpoints()

    # User submits only 1 of the 3 accounts present in the QBO re-pull.
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026, "months": [1, 2],
            "rows": [
                {"account_number": "1000", "account_name": "Cash",
                 "link_code": "actif.encaisse"},
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 409
    assert "Data drift" in r.json()["detail"]
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 0


def test_commit_empty_months_returns_422(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={"fiscal_year": 2026, "months": [], "rows": [],
              "overwrite_existing_tb": False},
    )
    assert r.status_code == 422
```

- [ ] **Step 2: Delete redundant single-month commit tests**

The two new multi-month tests added in Task 3 and Step 1 above already cover the conflict and overwrite paths. Delete these existing tests, which are now redundant (and the overwrite one no longer works under the new model since commit pulls amounts from QBO rather than the request body):

- `test_commit_conflict_without_overwrite` — covered by `test_commit_multi_month_conflict_without_overwrite_writes_nothing`
- `test_commit_overwrite_replaces_entries` — covered by `test_commit_overwrite_replaces_conflicting_months_only`
- `test_commit_invalid_month` — covered by `test_commit_empty_months_returns_422`

- [ ] **Step 3: Update remaining single-month commit tests to the new request shape**

For each of these remaining tests, rewrite the JSON body to use `months: [3]` instead of `month: 3` and remove `debit`/`credit` from each row. Wrap with `@respx.mock` and call `_mock_preview_endpoints()` at the top (commit now re-pulls QBO):

- `test_commit_creates_tb_chart_and_mappings`
- `test_commit_skips_rows`
- `test_commit_updates_existing_mapping`
- `test_commit_rejects_unknown_link_code`
- `test_commit_skipped_rows_exempt_from_validation`

Each test must call `service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)` near the top to satisfy `_require_active_connection`. Add `user` to the destructuring of `org_user_company` where it's currently `_, _, company`.

The fixture returned by `_mock_preview_endpoints()` contains three accounts (1000, 4000, 6010). Any non-skipped account in QBO that's missing from the user's `rows` triggers the data-drift 409, so every test must include all three accounts — either as live rows or as `skip: True` placeholders.

For example, `test_commit_creates_tb_chart_and_mappings` becomes:

```python
@respx.mock
def test_commit_creates_tb_chart_and_mappings(auth_client, db, org_user_company):
    _, user, company = org_user_company
    service.upsert_connection(db, company.id, "realm-1", _tokens(), user.id)
    _seed_legacy_codes_structure(db, company)
    _mock_preview_endpoints()
    body = {
        "fiscal_year": 2026, "months": [3],
        "rows": [
            {"account_number": "1000", "account_name": "Cash",
             "link_code": "actif.encaisse"},
            {"account_number": "4000", "account_name": "Sales",
             "link_code": "revenus.ventes"},
            {"account_number": "6010", "account_name": "Office",
             "link_code": None, "skip": True},  # in fixture but skipped
        ],
        "overwrite_existing_tb": False,
    }
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit", json=body,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["months_imported"] == 1
    assert body["accounts_imported"] == 2
    assert body["mappings_created"] == 2
    assert body["mappings_updated"] == 0
    assert db.query(ChartOfAccount).filter_by(company_id=company.id).count() == 2
    assert db.query(TrialBalanceEntry).filter_by(company_id=company.id).count() == 2
```

Apply the same shape and `@respx.mock` / `_mock_preview_endpoints()` / connection setup pattern to the other four tests. Adjust each test's row list so it covers all three fixture accounts (live or skipped).

- [ ] **Step 4: Run all commit tests**

```bash
cd backend && python -m pytest tests/integrations/quickbooks/test_router.py -k commit -v
```

Expected: all commit tests pass.

- [ ] **Step 5: Run the full QBO test module**

```bash
cd backend && python -m pytest tests/integrations/quickbooks/ -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/tests/integrations/quickbooks/test_router.py
git commit -m "test(qbo): cover multi-month commit, drift, overwrite scope"
```

---

## Task 6: Frontend API client

**Files:**
- Modify: `frontend/lib/api.ts:1697-1777` (QBO types and functions)

- [ ] **Step 1: Update types and functions**

In `frontend/lib/api.ts`, find the block starting at the existing `QboTrialBalanceProposalRow` type (around line 1697). Replace it through `commitQboTrialBalance` (around line 1777) with:

```typescript
export type QboMonthAmount = { debit: number; credit: number }

export type QboTrialBalanceProposalRow = {
  qbo_account_id: string
  account_number: string
  account_name: string
  qbo_account_type: string | null
  qbo_account_sub_type: string | null
  existing_link_code: string | null
  monthly_amounts: Record<string, QboMonthAmount>
}

export type QboTrialBalancePreview = {
  fiscal_year: number
  months: number[]
  currency: string
  fetched_at: string
  existing_months: number[]
  rows: QboTrialBalanceProposalRow[]
}

export type QboLinkCode = {
  code: string
  label: string
  statement_type: string
  parent_id: string | null
  parent_label: string | null
}

export type QboCommitRow = {
  account_number: string
  account_name: string
  link_code: string | null
  skip?: boolean
}

export async function getQboConnectionStatus(companyId: string): Promise<QboConnectionStatus> {
  return apiFetch<QboConnectionStatus>(`/api/quickbooks/companies/${companyId}/connection`)
}

export async function getQboAuthorizeUrl(companyId: string): Promise<string> {
  const r = await apiFetch<{ authorize_url: string }>(
    `/api/quickbooks/authorize?company_id=${companyId}`,
  )
  return r.authorize_url
}

export async function disconnectQbo(companyId: string): Promise<void> {
  await apiFetch<void>(`/api/quickbooks/companies/${companyId}/connection`, {
    method: "DELETE",
  })
}

export async function previewQboTrialBalance(
  companyId: string,
  fiscalYear: number,
  months: number[],
): Promise<QboTrialBalancePreview> {
  return apiFetch<QboTrialBalancePreview>(
    `/api/quickbooks/companies/${companyId}/trial-balance/preview`,
    { method: "POST", body: { fiscal_year: fiscalYear, months } },
  )
}

export async function commitQboTrialBalance(
  companyId: string,
  fiscalYear: number,
  months: number[],
  rows: QboCommitRow[],
  overwriteExistingTb: boolean,
): Promise<{
  months_imported: number
  accounts_imported: number
  mappings_created: number
  mappings_updated: number
}> {
  return apiFetch(
    `/api/quickbooks/companies/${companyId}/trial-balance/commit`,
    {
      method: "POST",
      body: {
        fiscal_year: fiscalYear,
        months,
        rows,
        overwrite_existing_tb: overwriteExistingTb,
      },
    },
  )
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
cd frontend && pnpm tsc --noEmit
```

Expected: type errors only in [frontend/components/quickbooks-review-table.tsx](frontend/components/quickbooks-review-table.tsx) and [frontend/app/settings/companies/[id]/quickbooks/page.tsx](frontend/app/settings/companies/[id]/quickbooks/page.tsx) — those are fixed in the next tasks. No other files should have errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "refactor(qbo): frontend types and api client switch to months list"
```

---

## Task 7: Frontend connect screen — start/end month inputs

**Files:**
- Modify: `frontend/app/settings/companies/[id]/quickbooks/page.tsx`

- [ ] **Step 1: Replace single-month input with start/end inputs**

In `frontend/app/settings/companies/[id]/quickbooks/page.tsx`, replace the state declarations near line 29-37:

```typescript
const now = new Date()
const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth()
const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

const [fiscalYear, setFiscalYear] = useState<number>(defaultYear)
const [startMonth, setStartMonth] = useState<number>(defaultMonth)
const [endMonth, setEndMonth] = useState<number>(defaultMonth)
const [previewing, setPreviewing] = useState(false)
const [preview, setPreview] = useState<QboTrialBalancePreview | null>(null)
const [banner, setBanner] = useState<Banner>(null)

const months = useMemo(() => {
  if (startMonth < 1 || endMonth > 12 || startMonth > endMonth) return []
  const out: number[] = []
  for (let m = startMonth; m <= endMonth; m++) out.push(m)
  return out
}, [startMonth, endMonth])
const rangeValid = months.length > 0
```

Add `useMemo` to the import from React:

```typescript
import { useEffect, useMemo, useState } from "react"
```

- [ ] **Step 2: Replace the form markup**

Replace the `<div className="grid grid-cols-2 gap-4">…</div>` block (around lines 122-143) and the Preview button (around lines 144-172) with:

```tsx
<div className="grid grid-cols-3 gap-4">
  <div>
    <Label htmlFor="fy">Fiscal year</Label>
    <Input
      id="fy"
      type="number"
      value={fiscalYear}
      onChange={(e) => setFiscalYear(Number(e.target.value))}
    />
  </div>
  <div>
    <Label htmlFor="start-mo">Start month (1-12)</Label>
    <Input
      id="start-mo"
      type="number"
      min={1}
      max={12}
      value={startMonth}
      onChange={(e) => setStartMonth(Number(e.target.value))}
    />
  </div>
  <div>
    <Label htmlFor="end-mo">End month (1-12)</Label>
    <Input
      id="end-mo"
      type="number"
      min={1}
      max={12}
      value={endMonth}
      onChange={(e) => setEndMonth(Number(e.target.value))}
    />
  </div>
</div>
{!rangeValid && (
  <p className="text-xs text-red-600">
    Start month must be ≤ end month and both must be in 1–12.
  </p>
)}
<div className="flex flex-wrap gap-2">
  <Button
    onClick={async () => {
      setPreviewing(true)
      setBanner(null)
      try {
        setPreview(
          await previewQboTrialBalance(companyId, fiscalYear, months),
        )
      } catch (e) {
        const msg =
          e instanceof ApiError
            ? `${e.detail} (status ${e.status})`
            : e instanceof Error
            ? e.message
            : String(e)
        setBanner({ variant: "error", message: `Preview failed: ${msg}` })
      } finally {
        setPreviewing(false)
      }
    }}
    disabled={previewing || !rangeValid}
  >
    {previewing
      ? `Pulling ${months.length} ${months.length === 1 ? "month" : "months"}…`
      : `Preview ${months.length} ${months.length === 1 ? "month" : "months"}`}
  </Button>
  <Button
    variant="outline"
    onClick={async () => {
      await disconnect()
      setBanner({ variant: "info", message: "Disconnected from QuickBooks." })
    }}
  >
    Disconnect
  </Button>
</div>
```

- [ ] **Step 3: Update the success-toast handler to read multi-month counts**

In the `<QuickBooksReviewTable>` element near the bottom of the file, replace the `onCommitted` callback:

```tsx
onCommitted={async (counts) => {
  setPreview(null)
  setBanner({
    variant: "success",
    message: `Trial balance imported — ${counts.months_imported} ${
      counts.months_imported === 1 ? "month" : "months"
    }, ${counts.accounts_imported} accounts, ${counts.mappings_created} new mappings, ${counts.mappings_updated} updated.`,
  })
  await refresh()
}}
```

- [ ] **Step 4: Verify the page typechecks**

```bash
cd frontend && pnpm tsc --noEmit
```

Expected: type errors only in [frontend/components/quickbooks-review-table.tsx](frontend/components/quickbooks-review-table.tsx) (next task). The page itself should be clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/settings/companies/[id]/quickbooks/page.tsx
git commit -m "feat(qbo): start/end month inputs send a months list to preview"
```

---

## Task 8: Frontend review table — per-month columns, range header, collapse

**Files:**
- Modify: `frontend/components/quickbooks-review-table.tsx`
- Modify: `frontend/lib/financial-utils.ts` (add `formatCompactAmount` helper)

- [ ] **Step 1: Add `formatCompactAmount` to the utilities**

In `frontend/lib/financial-utils.ts`, add this helper near the existing formatters:

```typescript
/**
 * Compact monetary formatter for narrow table cells.
 * 12345.67 -> "12.3k"; -4500 -> "(4.5k)"; 12 -> "12.00"; 0 -> "—".
 */
export function formatCompactAmount(value: number): string {
  if (value === 0) return "—"
  const abs = Math.abs(value)
  const formatted =
    abs >= 1_000_000
      ? `${(abs / 1_000_000).toFixed(1)}m`
      : abs >= 1_000
      ? `${(abs / 1_000).toFixed(1)}k`
      : abs.toFixed(2)
  return value < 0 ? `(${formatted})` : formatted
}
```

- [ ] **Step 2: Update `RowState` and the row mapper**

In `frontend/components/quickbooks-review-table.tsx`, replace `RowState` (line ~199-209) with:

```typescript
type RowState = {
  account_number: string
  account_name: string
  qbo_type: string | null
  qbo_subtype: string | null
  link_code: string | null
  existing_link_code: string | null
  skip: boolean
  monthly_amounts: Record<string, { debit: number; credit: number }>
}
```

Update the initial `rows` state (around line 226-238):

```typescript
const [rows, setRows] = useState<RowState[]>(() =>
  preview.rows.map((r) => ({
    account_number: r.account_number,
    account_name: r.account_name,
    qbo_type: r.qbo_account_type,
    qbo_subtype: r.qbo_account_sub_type,
    link_code: r.existing_link_code,
    existing_link_code: r.existing_link_code,
    skip: false,
    monthly_amounts: r.monthly_amounts,
  })),
)
```

- [ ] **Step 3: Update totals/zero-amount/commit to use `monthly_amounts`**

Replace the `totals` memo (line ~296-300):

```typescript
const totals = useMemo(() => {
  let debit = 0
  let credit = 0
  for (const r of rows) {
    if (r.skip) continue
    for (const m of Object.values(r.monthly_amounts)) {
      debit += m.debit
      credit += m.credit
    }
  }
  return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 }
}, [rows])
```

The `totals` object now reflects the sum across **all months** in the range. Update the label below the table to say so:

```tsx
<div
  className={
    "text-sm " +
    (totals.balanced ? "text-muted-foreground" : "text-red-600 font-semibold")
  }
>
  Debit total (all months): {totals.debit.toFixed(2)} · Credit total:{" "}
  {totals.credit.toFixed(2)}
  {!totals.balanced && " — does not balance!"}
</div>
```

Replace the `zeroAmountUnskipped` memo (line ~302-305) — a row counts as zero-amount only if every month has zero activity:

```typescript
const isAllZero = (r: RowState) =>
  Object.values(r.monthly_amounts).every(
    (m) => m.debit === 0 && m.credit === 0,
  )
const zeroAmountUnskipped = useMemo(
  () => rows.filter((r) => !r.skip && isAllZero(r)).length,
  [rows],
)
```

Update `skipAllZeroAmount` to use the same predicate:

```typescript
const skipAllZeroAmount = () => {
  setRows((prev) =>
    prev.map((r) =>
      !r.skip && isAllZero(r) ? { ...r, skip: true } : r,
    ),
  )
}
```

Replace the commit payload mapper inside `doCommit` (line ~397-415) — `debit`/`credit` are no longer sent:

```typescript
const payload: QboCommitRow[] = rows.map((r) => ({
  account_number: r.account_number,
  account_name: r.account_name,
  link_code: r.link_code,
  skip: r.skip,
}))
const result = await commitQboTrialBalance(
  companyId,
  preview.fiscal_year,
  preview.months,
  payload,
  overwrite,
)
```

Update `onCommitted` prop type to receive the new counts:

```typescript
interface ReviewTableProps {
  companyId: string
  preview: QboTrialBalancePreview
  onCancel: () => void
  onCommitted: (counts: {
    months_imported: number
    accounts_imported: number
    mappings_created: number
    mappings_updated: number
  }) => void
}
```

- [ ] **Step 4: Add range header and overwrite-conflict messaging**

Replace the existing `<CardTitle>` block (line ~431-439) with:

```tsx
<CardTitle>
  Review trial balance — {preview.fiscal_year}
  {preview.months.length === 1
    ? `-${String(preview.months[0]).padStart(2, "0")}`
    : ` (${MONTH_LABELS[preview.months[0] - 1]} – ${MONTH_LABELS[preview.months[preview.months.length - 1] - 1]})`}
  {" "}({preview.currency})
</CardTitle>
<p className="text-xs text-muted-foreground">
  {preview.months.length} {preview.months.length === 1 ? "month" : "months"}.
  QBO imports are stored as year-to-date (cumulative); financial statements
  de-cumulate on read.
  {preview.existing_months.length > 0 && (
    <>
      {" "}
      <span className="text-amber-700 font-medium">
        {preview.existing_months.length} of these{" "}
        {preview.existing_months.length === 1 ? "month is" : "months are"}{" "}
        already imported — overwrite to replace{" "}
        {preview.existing_months.length === 1 ? "it" : "them"}.
      </span>
    </>
  )}
</p>
```

Add this constant near the top of the file (above `QuickBooksReviewTable`):

```typescript
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
```

- [ ] **Step 5: Replace Debit/Credit columns with per-month or collapsed view**

In the table header (line ~550-573), replace the `Debit` and `Credit` columns:

```tsx
<TableHead className="w-[90px]">Account #</TableHead>
<TableHead>Name</TableHead>
<TableHead className="w-[140px]">QBO type</TableHead>
{preview.months.length <= 6 ? (
  preview.months.map((m) => (
    <TableHead key={m} className="w-[80px] text-right text-xs">
      {MONTH_LABELS[m - 1]}
    </TableHead>
  ))
) : (
  <TableHead className="w-[120px] text-right text-xs">
    Activity ({MONTH_LABELS[preview.months[0] - 1]}–
    {MONTH_LABELS[preview.months[preview.months.length - 1] - 1]})
  </TableHead>
)}
<TableHead className="w-[260px]">Link code</TableHead>
<TableHead className="w-[60px]">Skip</TableHead>
```

Add `formatCompactAmount` to the imports:

```typescript
import { formatCompactAmount } from "@/lib/financial-utils"
```

In the table body (replace the existing `<TableCell>` for Debit and Credit, line ~610-615), render per-month or collapsed cells:

```tsx
{preview.months.length <= 6 ? (
  preview.months.map((m) => {
    const amt = r.monthly_amounts[String(m)]
    const net = amt ? amt.debit - amt.credit : 0
    return (
      <TableCell key={m} className="text-right font-mono text-xs">
        {amt ? formatCompactAmount(net) : "—"}
      </TableCell>
    )
  })
) : (
  <TableCell className="text-right font-mono text-xs">
    {(() => {
      const net = Object.values(r.monthly_amounts).reduce(
        (s, a) => s + (a.debit - a.credit),
        0,
      )
      return formatCompactAmount(net)
    })()}
  </TableCell>
)}
```

- [ ] **Step 6: Update the conflict dialog and commit button labels**

Replace the import button (line ~670-675):

```tsx
<Button
  onClick={() => doCommit(false)}
  disabled={!canCommit || committing}
>
  {committing
    ? "Importing…"
    : `Import ${preview.months.length} ${preview.months.length === 1 ? "month" : "months"}`}
</Button>
```

Replace the conflict-dialog title (line ~680-687):

```tsx
<DialogTitle>
  {preview.existing_months.length === 1
    ? `Month ${preview.existing_months[0]} already has a trial balance.`
    : `${preview.existing_months.length} months already have trial balances: ${preview.existing_months.join(", ")}.`}
</DialogTitle>
```

Replace the dialog body paragraph:

```tsx
<p className="text-sm">
  Overwrite the existing {preview.existing_months.length === 1 ? "entries" : "entries for those months"}? Other months in the range are unaffected. This cannot be undone.
</p>
```

- [ ] **Step 7: Verify the build passes**

```bash
cd frontend && pnpm tsc --noEmit
```

Expected: clean. No errors.

```bash
cd frontend && pnpm build
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add frontend/components/quickbooks-review-table.tsx frontend/lib/financial-utils.ts
git commit -m "feat(qbo): review table renders per-month amounts with range header"
```

---

## Task 9: Frontend e2e tests

**Files:**
- Modify: `frontend/e2e/quickbooks.spec.ts`

- [ ] **Step 1: Update the existing "happy path" test**

In `frontend/e2e/quickbooks.spec.ts`, find the `"connected → preview → commit happy path"` test (around line 70). Update the preview mock body to the new shape:

```typescript
await page.route(
  `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/preview`,
  (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        fiscal_year: 2026,
        months: [3],
        currency: "CAD",
        fetched_at: "2026-04-14T00:00:00Z",
        existing_months: [],
        rows: [
          {
            qbo_account_id: "1",
            account_number: "1000",
            account_name: "Cash",
            qbo_account_type: "Bank",
            qbo_account_sub_type: "Checking",
            existing_link_code: "actif.encaisse",
            monthly_amounts: { "3": { debit: 5000, credit: 0 } },
          },
          {
            qbo_account_id: "42",
            account_number: "4000",
            account_name: "Sales",
            qbo_account_type: "Income",
            qbo_account_sub_type: "SalesOfProductIncome",
            existing_link_code: "revenus.ventes",
            monthly_amounts: { "3": { debit: 0, credit: 5000 } },
          },
        ],
      }),
    }),
)
```

Update the commit mock body:

```typescript
body: JSON.stringify({
  months_imported: 1,
  accounts_imported: 2,
  mappings_created: 2,
  mappings_updated: 0,
}),
```

Update the click expectations to match the new button text:

```typescript
await page.getByRole("button", { name: /preview 1 month/i }).click()
await expect(page.getByText("Cash")).toBeVisible()
await expect(page.getByText("Sales", { exact: true })).toBeVisible()
await page.getByRole("button", { name: /import 1 month/i }).click()
await expect(page.getByText(/trial balance imported/i)).toBeVisible()
```

- [ ] **Step 2: Add a multi-month range happy-path test**

Add this test next to the existing happy-path test:

```typescript
test("multi-month range → preview shows per-month columns → commit", async ({ page }) => {
  await setupAuthAndCommonMocks(page)
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/connection`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "connected",
          realm_id: "12345",
          connected_at: "2026-04-14T00:00:00Z",
        }),
      }),
  )
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/preview`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          fiscal_year: 2026,
          months: [1, 2, 3],
          currency: "CAD",
          fetched_at: "2026-04-14T00:00:00Z",
          existing_months: [],
          rows: [
            {
              qbo_account_id: "1",
              account_number: "1000",
              account_name: "Cash",
              qbo_account_type: "Bank",
              qbo_account_sub_type: "Checking",
              existing_link_code: "actif.encaisse",
              monthly_amounts: {
                "1": { debit: 5000, credit: 0 },
                "2": { debit: 5500, credit: 0 },
                "3": { debit: 6000, credit: 0 },
              },
            },
          ],
        }),
      }),
  )
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/link-codes`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            code: "actif.encaisse",
            label: "Encaisse",
            statement_type: "balance-sheet",
            parent_id: "actifs-courants",
            parent_label: "Actifs courants",
          },
        ]),
      }),
  )
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/commit`,
    (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          months_imported: 3,
          accounts_imported: 1,
          mappings_created: 0,
          mappings_updated: 0,
        }),
      }),
  )

  await page.goto(URL)
  await page.getByLabel(/start month/i).fill("1")
  await page.getByLabel(/end month/i).fill("3")
  await page.getByRole("button", { name: /preview 3 months/i }).click()
  await expect(page.getByRole("columnheader", { name: "Jan" })).toBeVisible()
  await expect(page.getByRole("columnheader", { name: "Feb" })).toBeVisible()
  await expect(page.getByRole("columnheader", { name: "Mar" })).toBeVisible()
  await page.getByRole("button", { name: /import 3 months/i }).click()
  await expect(page.getByText(/3 months/i)).toBeVisible()
})
```

- [ ] **Step 3: Add an `existing_months` banner test**

Add this test:

```typescript
test("existing months are flagged in the review header", async ({ page }) => {
  await setupAuthAndCommonMocks(page)
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/connection`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "connected",
          realm_id: "12345",
        }),
      }),
  )
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/preview`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          fiscal_year: 2026,
          months: [1, 2, 3],
          currency: "CAD",
          fetched_at: "2026-04-14T00:00:00Z",
          existing_months: [1, 2],
          rows: [
            {
              qbo_account_id: "1",
              account_number: "1000",
              account_name: "Cash",
              qbo_account_type: "Bank",
              qbo_account_sub_type: "Checking",
              existing_link_code: "actif.encaisse",
              monthly_amounts: {
                "3": { debit: 6000, credit: 0 },
              },
            },
          ],
        }),
      }),
  )
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/link-codes`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
  )

  await page.goto(URL)
  await page.getByLabel(/start month/i).fill("1")
  await page.getByLabel(/end month/i).fill("3")
  await page.getByRole("button", { name: /preview 3 months/i }).click()
  await expect(page.getByText(/2 of these months are already imported/i)).toBeVisible()
})
```

- [ ] **Step 4: Update the conflict-overwrite test**

Find the `"conflict → overwrite modal → retry succeeds"` test (around line 168). Update the preview mock to the new shape (similar to step 1) and the commit response to include `months_imported: 1`. Update the import-button click locator to `/import 1 month/i`.

- [ ] **Step 5: Update the "create new link code" test**

Find the `"create new link code from review table"` test. Update the preview mock to the new shape (`months: [3]`, `existing_months: []`, `monthly_amounts`). Keep the rest of the test logic intact.

- [ ] **Step 6: Run all QBO e2e tests**

```bash
cd frontend && pnpm test:e2e quickbooks
```

Expected: all four QBO tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/e2e/quickbooks.spec.ts
git commit -m "test(qbo): e2e covers multi-month range, existing-months banner"
```

---

## Task 10: Update the QBO release checklist doc

**Files:**
- Modify: `docs/quickbooks-release-checklist.md`

- [ ] **Step 1: Update example payloads in the checklist**

Find any `month: <n>` or `"month":` references in `docs/quickbooks-release-checklist.md` and replace them with `months: [<n>]` / `"months": [<n>]`. Update the smoke-test step descriptions to mention picking a "start and end month" rather than a single month.

If the checklist references the response shape, update `accounts_imported` summaries to also include `months_imported`.

- [ ] **Step 2: Commit**

```bash
git add docs/quickbooks-release-checklist.md
git commit -m "docs(qbo): update release checklist for multi-month flow"
```

---

## Final Verification

- [ ] **Run the full backend test suite**

```bash
cd backend && python -m pytest -v
```

Expected: PASS. No regressions outside the QBO module.

- [ ] **Run the frontend type-check and build**

```bash
cd frontend && pnpm tsc --noEmit && pnpm build
```

Expected: both succeed.

- [ ] **Run the full e2e suite**

```bash
cd frontend && pnpm test:e2e
```

Expected: PASS. The QBO multi-month tests plus all unrelated e2e tests pass.

- [ ] **Smoke-test in the browser**

```bash
docker-compose up
```

Then in a browser at `http://localhost:3000`:
1. Connect a sandbox QBO company (or use an existing connection).
2. Pick FY = current, start month = 1, end month = 3 → Preview.
3. Verify the review table shows three per-month columns (Jan/Feb/Mar) and the account union.
4. Pick link codes, click "Import 3 months" → success toast says "3 months."
5. Re-run with start=1, end=3 and the same FY → conflict dialog mentions 3 existing months → Overwrite → success.
6. Pick start=1, end=10 → Preview → confirm the table collapses to a single "Activity (Jan–Oct)" column.
