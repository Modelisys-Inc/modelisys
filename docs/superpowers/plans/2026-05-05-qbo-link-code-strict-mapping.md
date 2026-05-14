# QBO Link-Code Strict Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the QBO trial-balance auto-proposal with a strict picker that lets users pick from existing link codes in their company's statement structure or create new ones inline (which are persisted to the structure).

**Architecture:** Backend-first. Drop `proposed_link_code` / `confidence` from the preview response, delete `mapping_rules.py`, repoint the existing `list_link_codes` endpoint to read from `CompanyStatementStructure` (the source of truth for what statements actually render), add a `POST /link-codes` endpoint that inserts a leaf into the company's statement structure, and add strict commit-time validation that every non-skipped row's link code exists in that structure. Frontend swaps the free-form input for a Combobox + an inline "Create link code" dialog.

**Tech Stack:** FastAPI / SQLAlchemy / Pydantic on the backend. React 19 / Next.js 16 / shadcn (Popover + Command + Dialog + Select) on the frontend. pytest for backend tests, Playwright for frontend e2e.

**Spec:** [docs/superpowers/specs/2026-05-05-qbo-link-code-strict-mapping-design.md](../specs/2026-05-05-qbo-link-code-strict-mapping-design.md)

---

## Files affected

**Backend — modify:**
- `backend/app/integrations/quickbooks/service.py` — drop `propose` import + `proposed_link_code`/`confidence` from `propose_trial_balance`; add valid-code validation in `commit_trial_balance`.
- `backend/app/integrations/quickbooks/router.py` — repoint `list_link_codes` to `CompanyStatementStructure`; add `POST /companies/{id}/link-codes`.
- `backend/app/schemas/quickbooks.py` — drop `proposed_link_code`/`confidence` from `TrialBalanceRowProposal`; expand `LinkCodeOption`; add `LinkCodeCreateRequest`.
- `backend/tests/integrations/quickbooks/test_router.py` — drop confidence assertions; add new endpoint tests; add commit validation tests.

**Backend — delete:**
- `backend/app/integrations/quickbooks/mapping_rules.py`
- `backend/tests/integrations/quickbooks/test_mapping_rules.py`

**Frontend — modify:**
- `frontend/lib/api.ts` — drop `proposed_link_code`/`confidence` from `QboTrialBalanceProposalRow`; expand `QboLinkCode`; add `createLinkCode`.
- `frontend/components/quickbooks-review-table.tsx` — Combobox picker, drop confidence column, new filters, wire create dialog.
- `frontend/e2e/quickbooks.spec.ts` — update mocks, add create-link-code test.

**Frontend — create:**
- `frontend/components/quickbooks-create-link-code-dialog.tsx`

**Docs — modify:**
- `CLAUDE.md` — note the strict mapping flow.

---

## Task 1: Drop `proposed_link_code` and `confidence` from preview response

**Files:**
- Modify: `backend/app/schemas/quickbooks.py:20-30`
- Modify: `backend/app/integrations/quickbooks/service.py:191-231`
- Modify: `backend/tests/integrations/quickbooks/test_router.py` (any test asserting on `proposed_link_code` or `confidence`)

**Why first:** This change is small but ripples through the schema, service, and tests. Doing it in isolation gives a clean commit.

- [ ] **Step 1: Find every test reference to `proposed_link_code` and `confidence`**

Run: `grep -nE "proposed_link_code|confidence" backend/tests/integrations/quickbooks/test_router.py`

Note the line numbers and adjust assertions in step 4.

- [ ] **Step 2: Update the schema**

Replace `TrialBalanceRowProposal` in `backend/app/schemas/quickbooks.py`:

```python
class TrialBalanceRowProposal(BaseModel):
    qbo_account_id: str
    account_number: str
    account_name: str
    qbo_account_type: str | None = None
    qbo_account_sub_type: str | None = None
    debit: float
    credit: float
    existing_link_code: str | None = None
```

- [ ] **Step 3: Update `propose_trial_balance` in `service.py`**

In `backend/app/integrations/quickbooks/service.py`, remove the import:

```python
# DELETE this line:
from app.integrations.quickbooks.mapping_rules import propose
```

Replace the per-row dict-build inside `propose_trial_balance` (currently at ~lines 211-230). The new body of the loop:

```python
    rows: list[dict[str, Any]] = []
    for r in parse_trial_balance_report(report):
        acct_meta = accounts_by_id.get(str(r["qbo_account_id"]), {})
        acct_num = acct_meta.get("AcctNum") or r["account_number"]
        type_ = acct_meta.get("AccountType")
        sub_type = acct_meta.get("AccountSubType")
        existing = existing_mappings.get(acct_num)
        rows.append({
            "qbo_account_id": r["qbo_account_id"],
            "account_number": acct_num,
            "account_name": r["account_name"],
            "qbo_account_type": type_,
            "qbo_account_sub_type": sub_type,
            "debit": r["debit"],
            "credit": r["credit"],
            "existing_link_code": existing.link_code if existing else None,
        })
    return {"currency": company.currency, "rows": rows}
```

- [ ] **Step 4: Update existing tests**

In `backend/tests/integrations/quickbooks/test_router.py`, remove every assertion against `proposed_link_code` and `confidence`. Keep assertions against `existing_link_code`. If a test asserted `row["confidence"] == "high"`, just delete that line. If a test asserted on `row["proposed_link_code"]`, delete that line.

Do NOT delete tests entirely — only the assertions about removed fields.

- [ ] **Step 5: Run QBO tests**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py -x -q`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/quickbooks.py backend/app/integrations/quickbooks/service.py backend/tests/integrations/quickbooks/test_router.py
git commit -m "$(cat <<'EOF'
refactor(qbo): remove proposed_link_code and confidence from preview

The auto-proposal rules in mapping_rules.py produced generic French
defaults that didn't match real per-org link codes. Drop the proposed
fields from the preview response; the next change will require users
to pick or create a valid link code explicitly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Delete `mapping_rules.py` and its test

**Files:**
- Delete: `backend/app/integrations/quickbooks/mapping_rules.py`
- Delete: `backend/tests/integrations/quickbooks/test_mapping_rules.py`

- [ ] **Step 1: Confirm no remaining imports**

Run: `grep -rn "mapping_rules\|from app.integrations.quickbooks.mapping_rules" backend/`
Expected: no matches outside the files about to be deleted.

- [ ] **Step 2: Delete files**

```bash
rm backend/app/integrations/quickbooks/mapping_rules.py
rm backend/tests/integrations/quickbooks/test_mapping_rules.py
```

- [ ] **Step 3: Run full QBO test suite**

Run: `cd backend && python -m pytest tests/integrations/quickbooks -x -q`
Expected: all tests pass (and one fewer file collected).

- [ ] **Step 4: Commit**

```bash
git add -A backend/app/integrations/quickbooks/mapping_rules.py backend/tests/integrations/quickbooks/test_mapping_rules.py
git commit -m "$(cat <<'EOF'
refactor(qbo): delete mapping_rules.py auto-proposal logic

No longer imported. Users now pick or create link codes explicitly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Repoint `list_link_codes` to `CompanyStatementStructure`

**Files:**
- Modify: `backend/app/schemas/quickbooks.py:68-71` (`LinkCodeOption`)
- Modify: `backend/app/integrations/quickbooks/router.py:221-259`
- Modify: `backend/tests/integrations/quickbooks/test_router.py`

**Why:** Statements actually render from `CompanyStatementStructure` (per company), not `FinancialStatementMapping` (per org). The picker must read from the same table the renderer does.

- [ ] **Step 1: Update `LinkCodeOption` schema**

In `backend/app/schemas/quickbooks.py`, replace the existing `LinkCodeOption`:

```python
class LinkCodeOption(BaseModel):
    code: str
    label: str
    statement_type: str
    parent_id: str | None = None
    parent_label: str | None = None
```

- [ ] **Step 2: Write a failing test for the new behavior**

Add to `backend/tests/integrations/quickbooks/test_router.py`:

```python
from app.models.financial_statement_mapping import CompanyStatementStructure


def test_list_link_codes_reads_from_company_statement_structure(auth_client, db, org_user_company):
    _, _, company = org_user_company
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="income-statement",
        structure=[
            {
                "id": "revenue",
                "label": "Revenus",
                "isSection": True,
                "children": [
                    {"id": "20-101", "label": "Développement sur mesure", "linkCode": "20-101"},
                    {"id": "20-102", "label": "Ventes de logiciels", "linkCode": "20-102"},
                ],
            },
        ],
    ))
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="balance-sheet",
        structure=[
            {
                "id": "actifs-courants",
                "label": "Actifs courants",
                "isSection": True,
                "children": [
                    {"id": "10-100", "label": "Encaisse", "linkCode": "10-100"},
                ],
            },
        ],
    ))
    db.commit()

    r = auth_client.get(f"/api/quickbooks/companies/{company.id}/link-codes")
    assert r.status_code == 200, r.text
    body = r.json()
    codes = {o["code"]: o for o in body}
    assert set(codes) == {"20-101", "20-102", "10-100"}
    assert codes["20-101"]["statement_type"] == "income-statement"
    assert codes["20-101"]["parent_id"] == "revenue"
    assert codes["20-101"]["parent_label"] == "Revenus"
    assert codes["10-100"]["statement_type"] == "balance-sheet"
    assert codes["10-100"]["parent_id"] == "actifs-courants"
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py::test_list_link_codes_reads_from_company_statement_structure -v`
Expected: FAIL — current endpoint reads from `FinancialStatementMapping` and returns no codes (or wrong shape).

- [ ] **Step 4: Update the endpoint**

Replace `list_link_codes` in `backend/app/integrations/quickbooks/router.py`:

```python
from app.models.financial_statement_mapping import CompanyStatementStructure


@router.get(
    "/companies/{company_id}/link-codes",
    response_model=list[LinkCodeOption],
)
def list_link_codes(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    structures = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company.id)
        .all()
    )
    options: list[LinkCodeOption] = []
    seen: set[str] = set()

    def walk(node, statement_type: str, parent_id: str | None, parent_label: str | None):
        if isinstance(node, dict):
            code = node.get("linkCode") or node.get("link_code")
            if code and code not in seen:
                seen.add(code)
                options.append(LinkCodeOption(
                    code=str(code),
                    label=str(node.get("label") or code),
                    statement_type=statement_type,
                    parent_id=parent_id,
                    parent_label=parent_label,
                ))
            children = node.get("children")
            if isinstance(children, list):
                next_parent_id = node.get("id")
                next_parent_label = node.get("label")
                for child in children:
                    walk(child, statement_type, next_parent_id, next_parent_label)
        elif isinstance(node, list):
            for item in node:
                walk(item, statement_type, parent_id, parent_label)

    for s in structures:
        walk(s.structure, s.statement_type, None, None)
    return options
```

Also remove the now-unused `FinancialStatementMapping` import at the top of the file if nothing else uses it (run grep first):

Run: `grep -n FinancialStatementMapping backend/app/integrations/quickbooks/router.py`
If only the import line remains, delete it.

- [ ] **Step 5: Run the new test plus the full router suite**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py -x -q`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/quickbooks.py backend/app/integrations/quickbooks/router.py backend/tests/integrations/quickbooks/test_router.py
git commit -m "$(cat <<'EOF'
fix(qbo): list_link_codes reads from CompanyStatementStructure

The org-level FinancialStatementMapping was the wrong source — actual
statements are rendered from CompanyStatementStructure. The picker now
returns codes that are guaranteed to appear on a statement, with the
statement type and parent section included for grouping/UX.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add `POST /api/companies/{id}/link-codes` endpoint

**Files:**
- Modify: `backend/app/schemas/quickbooks.py`
- Modify: `backend/app/integrations/quickbooks/router.py`
- Modify: `backend/tests/integrations/quickbooks/test_router.py`

- [ ] **Step 1: Add request schema**

Append to `backend/app/schemas/quickbooks.py`:

```python
class LinkCodeCreateRequest(BaseModel):
    statement_type: str
    parent_id: str
    link_code: str
    label: str
```

- [ ] **Step 2: Write failing tests**

Add to `backend/tests/integrations/quickbooks/test_router.py`:

```python
def _seed_income_structure(db, company):
    db.add(CompanyStatementStructure(
        company_id=company.id,
        statement_type="income-statement",
        structure=[
            {
                "id": "admin-expenses",
                "label": "Frais d'administration",
                "isSection": True,
                "children": [
                    {"id": "44-330", "label": "Salaires admin", "linkCode": "44-330"},
                ],
            },
        ],
    ))
    db.commit()


def test_create_link_code_appends_leaf_and_returns_option(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)

    r = auth_client.post(
        f"/api/companies/{company.id}/link-codes",
        json={
            "statement_type": "income-statement",
            "parent_id": "admin-expenses",
            "link_code": "44-999",
            "label": "Nouveau poste",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body == {
        "code": "44-999",
        "label": "Nouveau poste",
        "statement_type": "income-statement",
        "parent_id": "admin-expenses",
        "parent_label": "Frais d'administration",
    }

    db.expire_all()
    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company.id,
            CompanyStatementStructure.statement_type == "income-statement",
        )
        .first()
    )
    children = structure.structure[0]["children"]
    assert {"id": "44-999", "label": "Nouveau poste", "linkCode": "44-999"} in children


def test_create_link_code_invalid_statement_type_returns_422(auth_client, db, org_user_company):
    _, _, company = org_user_company
    r = auth_client.post(
        f"/api/companies/{company.id}/link-codes",
        json={
            "statement_type": "not-a-real-type",
            "parent_id": "admin-expenses",
            "link_code": "44-999",
            "label": "X",
        },
    )
    assert r.status_code == 422


def test_create_link_code_missing_parent_returns_422(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)
    r = auth_client.post(
        f"/api/companies/{company.id}/link-codes",
        json={
            "statement_type": "income-statement",
            "parent_id": "does-not-exist",
            "link_code": "44-999",
            "label": "X",
        },
    )
    assert r.status_code == 422
    assert "parent" in r.json()["detail"].lower()


def test_create_link_code_duplicate_returns_422(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)
    r = auth_client.post(
        f"/api/companies/{company.id}/link-codes",
        json={
            "statement_type": "income-statement",
            "parent_id": "admin-expenses",
            "link_code": "44-330",
            "label": "Conflict",
        },
    )
    assert r.status_code == 422
    assert "already" in r.json()["detail"].lower()
```

- [ ] **Step 3: Run tests to confirm they fail**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py -k create_link_code -v`
Expected: 4 failures — endpoint not implemented (404 for the route).

- [ ] **Step 4: Implement the endpoint**

Add to `backend/app/integrations/quickbooks/router.py`:

```python
from app.schemas.quickbooks import LinkCodeCreateRequest

VALID_STATEMENT_TYPES = {"income-statement", "balance-sheet", "cash-flow", "capex", "baiia"}


def _find_node_by_id(structure, target_id: str):
    """Walk the structure tree, return the dict with id == target_id, or None."""
    if isinstance(structure, list):
        for item in structure:
            found = _find_node_by_id(item, target_id)
            if found is not None:
                return found
    elif isinstance(structure, dict):
        if structure.get("id") == target_id:
            return structure
        children = structure.get("children")
        if isinstance(children, list):
            return _find_node_by_id(children, target_id)
    return None


def _collect_all_codes(structure) -> set[str]:
    out: set[str] = set()

    def walk(node):
        if isinstance(node, list):
            for item in node:
                walk(item)
        elif isinstance(node, dict):
            code = node.get("linkCode") or node.get("link_code")
            if code:
                out.add(str(code))
            walk(node.get("children"))

    walk(structure)
    return out


@router.post(
    "/companies/{company_id}/link-codes",
    response_model=LinkCodeOption,
    status_code=201,
)
def create_link_code(
    company_id: uuid.UUID,
    body: LinkCodeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)

    if body.statement_type not in VALID_STATEMENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid statement_type: {body.statement_type}",
        )
    if not body.link_code.strip():
        raise HTTPException(status_code=422, detail="link_code must not be empty")
    if not body.label.strip():
        raise HTTPException(status_code=422, detail="label must not be empty")

    all_structures = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company.id)
        .all()
    )
    for s in all_structures:
        if body.link_code in _collect_all_codes(s.structure):
            raise HTTPException(
                status_code=422,
                detail=f"link_code {body.link_code} already exists for this company",
            )

    target = next(
        (s for s in all_structures if s.statement_type == body.statement_type),
        None,
    )
    if target is None:
        raise HTTPException(
            status_code=422,
            detail=f"No {body.statement_type} structure exists for this company",
        )

    parent = _find_node_by_id(target.structure, body.parent_id)
    if parent is None:
        raise HTTPException(
            status_code=422,
            detail=f"Parent node {body.parent_id} not found in structure",
        )

    new_leaf = {"id": body.link_code, "label": body.label, "linkCode": body.link_code}
    children = parent.get("children")
    if not isinstance(children, list):
        children = []
        parent["children"] = children
    children.append(new_leaf)

    # SQLAlchemy JSON columns don't auto-detect mutations of nested structures
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(target, "structure")
    db.commit()

    return LinkCodeOption(
        code=body.link_code,
        label=body.label,
        statement_type=body.statement_type,
        parent_id=body.parent_id,
        parent_label=parent.get("label"),
    )
```

Also add the import at the top of the test file:

```python
from app.models.financial_statement_mapping import CompanyStatementStructure
```

(if not already added in Task 3).

- [ ] **Step 5: Note about route prefix**

The QBO router uses prefix `/api/quickbooks`. The new endpoint path in the spec is `/api/companies/{id}/link-codes` — but mounted under the QBO router it would be `/api/quickbooks/companies/{id}/link-codes`. Keep it on the QBO router for cohesion: the existing `GET /companies/{id}/link-codes` already lives there. The test URLs in step 2 use `/api/companies/{id}/link-codes` — **fix them now** to `/api/quickbooks/companies/{id}/link-codes`.

Run: `grep -n "/api/companies/.*link-codes" backend/tests/integrations/quickbooks/test_router.py`

For each match, change `/api/companies/` to `/api/quickbooks/companies/`.

- [ ] **Step 6: Run the new tests**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py -k create_link_code -v`
Expected: 4 passes.

- [ ] **Step 7: Run the full QBO test suite to check for regressions**

Run: `cd backend && python -m pytest tests/integrations/quickbooks -x -q`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/quickbooks.py backend/app/integrations/quickbooks/router.py backend/tests/integrations/quickbooks/test_router.py
git commit -m "$(cat <<'EOF'
feat(qbo): POST /link-codes appends a leaf to the company structure

Lets the QBO review screen create a brand-new link code inline. The
new leaf is inserted as a child of an existing section node in the
company's CompanyStatementStructure, so it shows up on the relevant
financial statement immediately.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Strict link-code validation in `commit_trial_balance`

**Files:**
- Modify: `backend/app/integrations/quickbooks/service.py`
- Modify: `backend/app/integrations/quickbooks/router.py`
- Modify: `backend/tests/integrations/quickbooks/test_router.py`

- [ ] **Step 1: Add an exception type**

In `backend/app/integrations/quickbooks/service.py`, near the existing `TBConflictError`:

```python
class InvalidLinkCodesError(Exception):
    def __init__(self, offending: list[tuple[str, str]]):
        # offending is list of (account_number, link_code)
        self.offending = offending
        super().__init__(
            "Invalid link codes: " + ", ".join(f"{a}={c}" for a, c in offending)
        )
```

- [ ] **Step 2: Write failing tests**

Add to `backend/tests/integrations/quickbooks/test_router.py`:

```python
def test_commit_rejects_unknown_link_code(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)
    # Need an active QBO connection to reach the commit handler? No — the
    # commit endpoint doesn't require a connection. It only needs the company.
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026,
            "month": 3,
            "rows": [
                {
                    "account_number": "1000",
                    "account_name": "Cash",
                    "debit": 100,
                    "credit": 0,
                    "link_code": "does-not-exist",
                    "skip": False,
                },
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 422, r.text
    body = r.json()
    assert "1000" in body["detail"]
    assert "does-not-exist" in body["detail"]


def test_commit_skipped_rows_exempt_from_validation(auth_client, db, org_user_company):
    _, _, company = org_user_company
    _seed_income_structure(db, company)
    r = auth_client.post(
        f"/api/quickbooks/companies/{company.id}/trial-balance/commit",
        json={
            "fiscal_year": 2026,
            "month": 3,
            "rows": [
                {
                    "account_number": "1000",
                    "account_name": "Cash",
                    "debit": 0,
                    "credit": 0,
                    "link_code": "does-not-exist",
                    "skip": True,
                },
                {
                    "account_number": "2000",
                    "account_name": "Salaire",
                    "debit": 100,
                    "credit": 0,
                    "link_code": "44-330",
                    "skip": False,
                },
            ],
            "overwrite_existing_tb": False,
        },
    )
    assert r.status_code == 201, r.text
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py -k commit -v`
Expected: 2 of the new tests fail (commit currently accepts any link code).

- [ ] **Step 4: Implement validation in `commit_trial_balance`**

In `backend/app/integrations/quickbooks/service.py`, edit the top of `commit_trial_balance` to gather valid codes and reject unknowns. Insert just after the `db.execute(... with_for_update())` line:

```python
    from app.models.financial_statement_mapping import CompanyStatementStructure

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
            _collect(node.get("children"))

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
```

- [ ] **Step 5: Translate the exception in the router**

In `backend/app/integrations/quickbooks/router.py`, update the commit endpoint's try/except:

```python
    try:
        result = qbo_service.commit_trial_balance(
            db, company, body.fiscal_year, body.month,
            [r.model_dump() for r in body.rows], body.overwrite_existing_tb,
        )
    except qbo_service.TBConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except qbo_service.InvalidLinkCodesError as e:
        offending_str = ", ".join(f"{acct}={code}" for acct, code in e.offending)
        raise HTTPException(
            status_code=422,
            detail=f"Invalid link codes: {offending_str}",
        )
```

- [ ] **Step 6: Run the new tests**

Run: `cd backend && python -m pytest tests/integrations/quickbooks/test_router.py -k commit -v`
Expected: all pass.

- [ ] **Step 7: Run full QBO test suite**

Run: `cd backend && python -m pytest tests/integrations/quickbooks -x -q`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add backend/app/integrations/quickbooks/service.py backend/app/integrations/quickbooks/router.py backend/tests/integrations/quickbooks/test_router.py
git commit -m "$(cat <<'EOF'
feat(qbo): commit rejects link codes not in CompanyStatementStructure

Every non-skipped row must reference a link code that exists somewhere
in the company's statement structure tree. Skipped rows are exempt.
422 with a list of offending account_number=link_code pairs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Frontend API client updates

**Files:**
- Modify: `frontend/lib/api.ts:1596-1681`

- [ ] **Step 1: Update types**

In `frontend/lib/api.ts`, replace the `QboTrialBalanceProposalRow` and `QboLinkCode` types:

```ts
export type QboTrialBalanceProposalRow = {
  qbo_account_id: string
  account_number: string
  account_name: string
  qbo_account_type: string | null
  qbo_account_sub_type: string | null
  debit: number
  credit: number
  existing_link_code: string | null
}

export type QboLinkCode = {
  code: string
  label: string
  statement_type: string
  parent_id: string | null
  parent_label: string | null
}
```

- [ ] **Step 2: Add `createLinkCode`**

Append below `listQboLinkCodes`:

```ts
export async function createLinkCode(
  companyId: string,
  body: {
    statement_type: string
    parent_id: string
    link_code: string
    label: string
  },
): Promise<QboLinkCode> {
  return apiFetch<QboLinkCode>(
    `/api/quickbooks/companies/${companyId}/link-codes`,
    { method: "POST", body },
  )
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: type errors in `quickbooks-review-table.tsx` (referring to removed `proposed_link_code` / `confidence`). Those will be fixed in Task 8.

- [ ] **Step 4: Don't commit yet** — frontend won't build until the review table is updated. Stage only this file:

```bash
git add frontend/lib/api.ts
```

Hold the commit until Task 8.

---

## Task 7: `CreateLinkCodeDialog` component

**Files:**
- Create: `frontend/components/quickbooks-create-link-code-dialog.tsx`

- [ ] **Step 1: Check what's available**

Run: `ls frontend/components/ui/ | grep -E "dialog|select|popover|command"`
Expected: `command.tsx`, `dialog.tsx`, `popover.tsx`, `select.tsx` all present.

- [ ] **Step 2: Find an existing structure-fetch helper**

Run: `grep -n "statement-structures" frontend/lib/api.ts`

If a helper exists, note its name. Otherwise, the dialog will fetch directly with `apiFetch`.

If there's no existing helper, add one near the QBO section in `frontend/lib/api.ts`:

```ts
export type StatementStructureNode = {
  id?: string
  label?: string
  isSection?: boolean
  isBold?: boolean
  isResult?: boolean
  linkCode?: string
  link_code?: string
  children?: StatementStructureNode[]
}

export async function getCompanyStatementStructure(
  companyId: string,
  statementType: string,
): Promise<{ structure: StatementStructureNode[] }> {
  return apiFetch<{ structure: StatementStructureNode[] }>(
    `/api/companies/${companyId}/statement-structures/${statementType}`,
  )
}
```

- [ ] **Step 3: Write the dialog**

Create `frontend/components/quickbooks-create-link-code-dialog.tsx`:

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ApiError,
  createLinkCode,
  getCompanyStatementStructure,
  type QboLinkCode,
  type StatementStructureNode,
} from "@/lib/api"

const STATEMENT_TYPES: { value: string; label: string }[] = [
  { value: "income-statement", label: "Income statement" },
  { value: "balance-sheet", label: "Balance sheet" },
  { value: "cash-flow", label: "Cash flow" },
  { value: "capex", label: "Capex" },
  { value: "baiia", label: "BAIIA" },
]

type ParentOption = { id: string; label: string }

function collectParents(nodes: StatementStructureNode[]): ParentOption[] {
  const out: ParentOption[] = []
  const walk = (list: StatementStructureNode[]) => {
    for (const n of list) {
      const isPlausibleParent =
        Boolean(n.id) && (n.isSection === true || (Array.isArray(n.children) && n.children.length > 0))
      if (isPlausibleParent) {
        out.push({ id: String(n.id), label: String(n.label ?? n.id) })
      }
      if (Array.isArray(n.children)) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

interface Props {
  companyId: string
  open: boolean
  defaultLabel?: string
  existingCodes: Set<string>
  onClose: () => void
  onCreated: (created: QboLinkCode) => void
}

export function CreateLinkCodeDialog({
  companyId,
  open,
  defaultLabel = "",
  existingCodes,
  onClose,
  onCreated,
}: Props) {
  const [statementType, setStatementType] = useState("income-statement")
  const [parents, setParents] = useState<ParentOption[]>([])
  const [parentId, setParentId] = useState<string>("")
  const [linkCode, setLinkCode] = useState("")
  const [label, setLabel] = useState(defaultLabel)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLabel(defaultLabel)
    setLinkCode("")
    setError(null)
  }, [open, defaultLabel])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getCompanyStatementStructure(companyId, statementType)
      .then((res) => {
        if (cancelled) return
        const opts = collectParents(res.structure || [])
        setParents(opts)
        setParentId(opts[0]?.id ?? "")
      })
      .catch(() => {
        if (cancelled) return
        setParents([])
        setParentId("")
      })
    return () => {
      cancelled = true
    }
  }, [open, companyId, statementType])

  const codeConflict = useMemo(
    () => linkCode.trim().length > 0 && existingCodes.has(linkCode.trim()),
    [linkCode, existingCodes],
  )

  const canSubmit =
    !!parentId && linkCode.trim().length > 0 && label.trim().length > 0 && !codeConflict && !submitting

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const created = await createLinkCode(companyId, {
        statement_type: statementType,
        parent_id: parentId,
        link_code: linkCode.trim(),
        label: label.trim(),
      })
      onCreated(created)
      onClose()
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
          ? e.message
          : String(e)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create link code</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cl-statement">Statement</Label>
            <Select value={statementType} onValueChange={setStatementType}>
              <SelectTrigger id="cl-statement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATEMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-parent">Parent section</Label>
            <Select value={parentId} onValueChange={setParentId} disabled={!parents.length}>
              <SelectTrigger id="cl-parent">
                <SelectValue placeholder={parents.length ? "Select…" : "No sections found"} />
              </SelectTrigger>
              <SelectContent>
                {parents.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-code">Link code</Label>
            <Input
              id="cl-code"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value)}
              placeholder="e.g. 44-999"
            />
            {codeConflict && (
              <p className="text-xs text-red-600">
                This code already exists for this company.
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cl-label">Label</Label>
            <Input
              id="cl-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no new errors from this file (the existing review-table errors from Task 6 are still present and will be fixed in Task 8).

- [ ] **Step 5: Stage but don't commit yet**

```bash
git add frontend/components/quickbooks-create-link-code-dialog.tsx frontend/lib/api.ts
```

(The lib/api.ts staging from Task 6 is already pending; this just adds the new helper if you wrote one in Step 2.)

---

## Task 8: Rewrite `QuickBooksReviewTable` to use the picker + dialog

**Files:**
- Modify: `frontend/components/quickbooks-review-table.tsx`

- [ ] **Step 1: Replace the whole file**

Overwrite `frontend/components/quickbooks-review-table.tsx`:

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreateLinkCodeDialog } from "@/components/quickbooks-create-link-code-dialog"
import {
  ApiError,
  commitQboTrialBalance,
  listQboLinkCodes,
  type QboCommitRow,
  type QboLinkCode,
  type QboTrialBalancePreview,
} from "@/lib/api"
import { cn } from "@/lib/utils"

type Filter = "all" | "unmapped" | "mapped"

type RowState = {
  account_number: string
  account_name: string
  debit: number
  credit: number
  qbo_type: string | null
  qbo_subtype: string | null
  link_code: string | null
  existing_link_code: string | null
  skip: boolean
}

interface ReviewTableProps {
  companyId: string
  preview: QboTrialBalancePreview
  onCancel: () => void
  onCommitted: (counts: { accounts_imported: number; mappings_created: number; mappings_updated: number }) => void
}

export function QuickBooksReviewTable({
  companyId,
  preview,
  onCancel,
  onCommitted,
}: ReviewTableProps) {
  const [linkCodes, setLinkCodes] = useState<QboLinkCode[]>([])
  const [rows, setRows] = useState<RowState[]>(() =>
    preview.rows.map((r) => ({
      account_number: r.account_number,
      account_name: r.account_name,
      debit: r.debit,
      credit: r.credit,
      qbo_type: r.qbo_account_type,
      qbo_subtype: r.qbo_account_sub_type,
      link_code: r.existing_link_code,
      existing_link_code: r.existing_link_code,
      skip: false,
    })),
  )
  const [filter, setFilter] = useState<Filter>("all")
  const [committing, setCommitting] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createOpenForRow, setCreateOpenForRow] = useState<number | null>(null)

  const refreshLinkCodes = () =>
    listQboLinkCodes(companyId).then(setLinkCodes).catch(() => setLinkCodes([]))

  useEffect(() => {
    refreshLinkCodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const codeIndex = useMemo(() => {
    const m = new Map<string, QboLinkCode>()
    for (const c of linkCodes) m.set(c.code, c)
    return m
  }, [linkCodes])

  const codesByStatement = useMemo(() => {
    const groups = new Map<string, QboLinkCode[]>()
    for (const c of linkCodes) {
      const list = groups.get(c.statement_type) ?? []
      list.push(c)
      groups.set(c.statement_type, list)
    }
    return groups
  }, [linkCodes])

  const codeSet = useMemo(() => new Set(linkCodes.map((c) => c.code)), [linkCodes])

  const counts = useMemo(
    () => ({
      mapped: rows.filter((r) => !!r.link_code).length,
      unmapped: rows.filter((r) => !r.skip && !r.link_code).length,
    }),
    [rows],
  )

  const totals = useMemo(() => {
    const debit = rows.filter((r) => !r.skip).reduce((s, r) => s + r.debit, 0)
    const credit = rows.filter((r) => !r.skip).reduce((s, r) => s + r.credit, 0)
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 }
  }, [rows])

  const visibleRows = useMemo(() => {
    if (filter === "mapped") return rows.filter((r) => !!r.link_code)
    if (filter === "unmapped")
      return rows.filter((r) => !r.skip && !r.link_code)
    return rows
  }, [rows, filter])

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const canCommit = rows.every((r) => r.skip || !!r.link_code)

  const doCommit = async (overwrite: boolean) => {
    setCommitting(true)
    setErrorMsg(null)
    try {
      const payload: QboCommitRow[] = rows.map((r) => ({
        account_number: r.account_number,
        account_name: r.account_name,
        debit: r.debit,
        credit: r.credit,
        link_code: r.link_code,
        skip: r.skip,
      }))
      const result = await commitQboTrialBalance(
        companyId,
        preview.fiscal_year,
        preview.month,
        payload,
        overwrite,
      )
      onCommitted(result)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflictOpen(true)
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        setErrorMsg(msg)
      }
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Review trial balance — {preview.fiscal_year}-
          {String(preview.month).padStart(2, "0")} ({preview.currency})
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className={filter === "all" ? "font-semibold underline" : ""}
            onClick={() => setFilter("all")}
          >
            All ({rows.length})
          </button>
          <button
            type="button"
            className={filter === "unmapped" ? "font-semibold underline" : ""}
            onClick={() => setFilter("unmapped")}
          >
            Unmapped ({counts.unmapped})
          </button>
          <button
            type="button"
            className={filter === "mapped" ? "font-semibold underline" : ""}
            onClick={() => setFilter("mapped")}
          >
            Mapped ({counts.mapped})
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>QBO type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Link code</TableHead>
                <TableHead>Skip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((r) => {
                const idx = rows.indexOf(r)
                const selected = r.link_code ? codeIndex.get(r.link_code) : null
                return (
                  <TableRow key={r.account_number}>
                    <TableCell className="font-mono text-xs">
                      {r.account_number}
                    </TableCell>
                    <TableCell>{r.account_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.qbo_type ?? "—"}
                      {r.qbo_subtype ? `/${r.qbo_subtype}` : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.debit.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.credit.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            role="combobox"
                            className="h-8 w-[260px] justify-between text-xs"
                          >
                            <span className="truncate">
                              {selected
                                ? `${selected.code} — ${selected.label}`
                                : r.link_code
                                ? `${r.link_code} (unknown)`
                                : "Pick a link code"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0">
                          <Command>
                            <CommandInput placeholder="Search link codes…" />
                            <CommandList>
                              <CommandEmpty>No codes found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => setCreateOpenForRow(idx)}
                                  className="font-medium"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Create new link code…
                                </CommandItem>
                              </CommandGroup>
                              <CommandSeparator />
                              {Array.from(codesByStatement.entries()).map(
                                ([stmt, list]) => (
                                  <CommandGroup key={stmt} heading={stmt}>
                                    {list.map((c) => (
                                      <CommandItem
                                        key={c.code}
                                        value={`${c.code} ${c.label}`}
                                        onSelect={() =>
                                          updateRow(idx, { link_code: c.code })
                                        }
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            r.link_code === c.code
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="font-mono text-xs">
                                            {c.code}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {c.label}
                                            {c.parent_label
                                              ? ` · ${c.parent_label}`
                                              : ""}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                ),
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {r.existing_link_code &&
                        r.existing_link_code !== r.link_code && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Was: {r.existing_link_code}
                          </Badge>
                        )}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={r.skip}
                        onCheckedChange={(v) => updateRow(idx, { skip: !!v })}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div
            className={
              "text-sm " +
              (totals.balanced ? "text-muted-foreground" : "text-red-600 font-semibold")
            }
          >
            Debit total: {totals.debit.toFixed(2)} · Credit total:{" "}
            {totals.credit.toFixed(2)}
            {!totals.balanced && " — does not balance!"}
          </div>
          {errorMsg && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={committing}>
              Cancel
            </Button>
            <Button
              onClick={() => doCommit(false)}
              disabled={!canCommit || committing}
            >
              {committing ? "Importing…" : "Import trial balance"}
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              A trial balance for {preview.fiscal_year}-
              {String(preview.month).padStart(2, "0")} already exists.
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Overwrite the existing entries? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setConflictOpen(false)
                await doCommit(true)
              }}
            >
              Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateLinkCodeDialog
        companyId={companyId}
        open={createOpenForRow !== null}
        defaultLabel={createOpenForRow !== null ? rows[createOpenForRow]?.account_name : ""}
        existingCodes={codeSet}
        onClose={() => setCreateOpenForRow(null)}
        onCreated={async (created) => {
          await refreshLinkCodes()
          if (createOpenForRow !== null) {
            updateRow(createOpenForRow, { link_code: created.code })
          }
        }}
      />
    </Card>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Build**

Run: `cd frontend && pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit (frontend)**

```bash
git add frontend/lib/api.ts frontend/components/quickbooks-create-link-code-dialog.tsx frontend/components/quickbooks-review-table.tsx
git commit -m "$(cat <<'EOF'
feat(qbo): strict link-code picker with inline create dialog

Replaces the free-form input with a Combobox that lists valid codes
from the company's statement structure (grouped by statement type)
and a "+ Create new link code" action that opens a dialog. The dialog
fetches plausible parent sections for the chosen statement type and
POSTs to the new endpoint, then sets the row's selected code.

Drops the confidence column and high/medium/low filters.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Update Playwright e2e

**Files:**
- Modify: `frontend/e2e/quickbooks.spec.ts`

- [ ] **Step 1: Update existing happy-path mock**

In `frontend/e2e/quickbooks.spec.ts`, find the trial-balance preview mock (around lines 85-130) and:
- Remove `proposed_link_code` and `confidence` fields from each row.
- Update the link-codes mock (search for `link-codes` in the file) — its response now needs the new shape `{ code, label, statement_type, parent_id, parent_label }`. Use codes that map to what's in the preview rows so the test can pick them.

Concretely, find the `link-codes` route mock and replace its body with:

```ts
JSON.stringify([
  {
    code: "10-100",
    label: "Encaisse",
    statement_type: "balance-sheet",
    parent_id: "actifs-courants",
    parent_label: "Actifs courants",
  },
  {
    code: "20-101",
    label: "Ventes",
    statement_type: "income-statement",
    parent_id: "revenue",
    parent_label: "Revenus",
  },
])
```

- [ ] **Step 2: Update the existing happy-path test**

The existing test commits with codes the user picked from the proposal. Replace the assertions that depend on `proposed_link_code` / "high confidence" filters. The flow now:

1. Open the page, click Preview.
2. The two rows render with the new combobox.
3. Click each row's combobox button, pick a code from the list, see the trigger label update.
4. Click Import, commit succeeds.

Concretely, replace the two `.fill()` calls (or whatever currently sets the link code) with:

```ts
// Pick "10-100" for the first row
await page
  .getByRole("button", { name: /pick a link code/i })
  .first()
  .click()
await page.getByRole("option", { name: /10-100/i }).click()

// Pick "20-101" for the second row
await page.getByRole("button", { name: /pick a link code/i }).first().click()
await page.getByRole("option", { name: /20-101/i }).click()
```

(`shadcn`'s Command items render with `role="option"`.)

- [ ] **Step 3: Add a test for the create-link-code flow**

Append a new test inside `test.describe("QuickBooks page", ...)`:

```ts
test("create new link code from review table", async ({ page }) => {
  await setupAuthAndCommonMocks(page)
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/connection`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "connected", realm_id: "12345", connected_at: "2026-04-14T00:00:00Z" }),
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
          month: 3,
          currency: "CAD",
          fetched_at: "2026-04-14T00:00:00Z",
          rows: [
            {
              qbo_account_id: "1",
              account_number: "1000",
              account_name: "Cash",
              qbo_account_type: "Bank",
              qbo_account_sub_type: "Checking",
              debit: 5000,
              credit: 0,
              existing_link_code: null,
            },
          ],
        }),
      }),
  )

  // Initial link-codes list: empty.
  let listCalls = 0
  await page.route(
    `**/api/quickbooks/companies/${COMPANY_ID}/link-codes`,
    (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            code: "10-100",
            label: "Cash",
            statement_type: "balance-sheet",
            parent_id: "actifs-courants",
            parent_label: "Actifs courants",
          }),
        })
      }
      listCalls += 1
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          listCalls === 1
            ? []
            : [
                {
                  code: "10-100",
                  label: "Cash",
                  statement_type: "balance-sheet",
                  parent_id: "actifs-courants",
                  parent_label: "Actifs courants",
                },
              ],
        ),
      })
    },
  )

  // Statement structure for the dialog parent selector.
  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              id: "actifs-courants",
              label: "Actifs courants",
              isSection: true,
              children: [],
            },
          ],
        }),
      }),
  )

  await page.goto(URL)
  await page.getByRole("button", { name: /preview trial balance/i }).click()

  // Open the picker, click "Create new link code…"
  await page.getByRole("button", { name: /pick a link code/i }).click()
  await page.getByRole("option", { name: /create new link code/i }).click()

  // Fill the dialog and submit.
  await page.getByRole("combobox").first().click() // statement type select
  await page.getByRole("option", { name: /balance sheet/i }).click()
  await page.getByLabel(/link code/i).fill("10-100")
  // label defaults to "Cash"
  await page.getByRole("button", { name: /^create$/i }).click()

  // Trigger now shows the new code.
  await expect(page.getByRole("button", { name: /10-100/i })).toBeVisible()
})
```

- [ ] **Step 4: Run e2e**

In one terminal: `cd frontend && pnpm dev` (or `docker compose up frontend`).
In another: `cd frontend && pnpm test:e2e -- quickbooks.spec.ts`
Expected: all tests pass.

If the new test fails because Playwright can't find the right `combobox` or `option` selectors (shadcn Select uses `role="combobox"` for the trigger and `role="option"` for items), iterate on selectors. Use `await page.pause()` to debug interactively.

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/quickbooks.spec.ts
git commit -m "$(cat <<'EOF'
test(qbo): e2e covers strict picker + inline link-code creation

Drops the proposed_link_code/confidence fields from the preview mock
and exercises the new combobox + create-dialog flow end-to-end.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Update CLAUDE.md and final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the QBO section**

In `CLAUDE.md`, find the bullet about "Mapping rules" (around line 207, currently says "Mapping rules (`mapping_rules.py`) are GENERIC defaults"). Replace it with:

```markdown
- **Strict link-code picker:** the QBO review screen reads valid link codes
  from `CompanyStatementStructure` (per company, per statement type). Users
  must pick an existing code or create a new one inline (`POST
  /api/quickbooks/companies/{id}/link-codes` appends a leaf to the structure).
  `commit_trial_balance` rejects any non-skipped row whose `link_code` is not
  in the structure (422).
```

- [ ] **Step 2: Run full backend test suite**

Run: `cd backend && python -m pytest -x -q`
Expected: all tests pass.

- [ ] **Step 3: Run frontend type-check + build**

Run: `cd frontend && pnpm tsc --noEmit && pnpm build`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(qbo): note strict link-code picker in CLAUDE.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Push and open PR (or merge)**

The branch is `feat/add-quickbooks-connector`. Confirm with the user whether to push, open a PR, or hold the commits locally.

---

## Self-review notes

- **Spec coverage:** every spec section has at least one task. Backend "remove" → Tasks 1+2; "repoint list_link_codes" → Task 3; "POST /link-codes" → Task 4; "strict commit validation" → Task 5; frontend API client → Task 6; CreateLinkCodeDialog → Task 7; review table rewrite → Task 8; e2e → Task 9; CLAUDE.md → Task 10.
- **No placeholders:** every step has either complete code or an exact command + expected output.
- **Type consistency:**
  - Backend `LinkCodeOption` shape is `{code, label, statement_type, parent_id, parent_label}` — used in Tasks 3, 4, 5 (validation), 6 (frontend type), 7 (dialog), 8 (review table), 9 (e2e mocks).
  - Frontend `QboLinkCode` matches the backend schema exactly.
  - Endpoint URL is `/api/quickbooks/companies/{id}/link-codes` (under the QBO router prefix), used consistently in Tasks 3, 4, 6, 9.
