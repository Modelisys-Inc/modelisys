# Full Pipeline Fix - Docker Rebuild, Statement Structures Seeding & Verification

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild Docker, seed statement structures data for the test company so financial statements display real data, verify all pages work, and commit all changes.

**Architecture:** The financial statement pipeline reads: Trial Balance entries → Account Mappings (link_code) → Statement Structures (linkCode per row) → Computed output. The code is fully implemented but no statement structure records exist in the database for the test company, so all endpoints return empty `rows: []`.

**Tech Stack:** Docker Compose, FastAPI, PostgreSQL 16, curl/API calls, Playwright

---

## Context

- **Test company ID:** `a17cc179-df90-4f56-a5f9-21ccd232f9f5`
- **Test credentials:** `playwright@modelisys.com` / `PlaywrightTest123`
- **Fiscal year end:** `03-31` (March 31) → FY 2025 = Apr 2024 - Mar 2025
- **Trial balance:** 12 months uploaded (Apr 2024 - Mar 2025)
- **Account mappings:** 124 accounts with link_codes from "Code de liaison.xlsx"
- **Statement structure format:** JSON array of `{id, label, linkCode, isBold, isSection, isResult, children, formula}`
- **Statement structure API:** `PUT /api/companies/{id}/statement-structures/{type}` with `{"structure": [...]}`
- **Valid types:** `income-statement`, `balance-sheet`, `cash-flow`, `capex`, `baiia`

### How rows map to data

The computation service in `backend/app/services/financial_statements.py`:
1. Reads the structure's `linkCode` for each row
2. Finds all account_mappings with matching `link_code`
3. Sums trial_balance amounts for those account numbers
4. For `formula` rows: computes `["+id1", "-id2"]` references to other rows

### What frontend components expect (label matching)

Components use `findRow(rows, label)` (case-insensitive) to locate specific rows:

**Income Statement:** revenus, coût des produits vendus, bénéfice brut, charges d'exploitation, bénéfice avant impôts, bénéfice net, BAIIA, amortissement
**Balance Sheet:** actifs courants, actifs non courants, total des actifs, passifs courants, passifs non courants, total des passifs, capitaux propres, immobilisations corporelles, immobilisations incorporelles
**Cash Flow:** exploitation/activités opérationnelles, investissement/activités d'investissement, financement/activités de financement, flux net/variation de trésorerie

---

### Task 1: Rebuild Docker

**Step 1: Bring down existing containers**
```bash
cd "d:\Alex\Documents\Alexandre Moreau Inc\Modelisys\Modelisys"
docker-compose down
```

**Step 2: Rebuild and start all services**
```bash
docker-compose up --build -d
```
Expected: All 3 services start (frontend, backend, db)

**Step 3: Wait for health and verify**
```bash
# Wait for backend to be ready
docker-compose logs --tail=20 backend
# Check API health
curl http://localhost:8001/docs
```
Expected: FastAPI docs page loads, backend is healthy

---

### Task 2: Run database migrations

**Step 1: Run Alembic migrations inside the backend container**
```bash
docker-compose exec backend alembic upgrade head
```
Expected: Migrations 001-004 applied (or already at head)

---

### Task 3: Discover existing link codes

**Step 1: Authenticate to get JWT token**
```bash
curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"playwright@modelisys.com\",\"password\":\"PlaywrightTest123\"}" | python -m json.tool
```
Expected: `{"access_token": "...", "token_type": "bearer"}`

**Step 2: Query account mappings to get all link codes**
```bash
curl -s http://localhost:8001/api/companies/a17cc179-df90-4f56-a5f9-21ccd232f9f5/account-mappings \
  -H "Authorization: Bearer <TOKEN>" | python -c "
import json, sys
data = json.load(sys.stdin)
codes = set()
for m in data['mappings']:
    if m.get('link_code'):
        codes.add(m['link_code'])
for c in sorted(codes):
    print(c)
"
```
Expected: List of distinct link_codes (e.g., REV-001, COGS-001, etc.)

**Step 3: Also check a few mappings to understand the pattern**
```bash
curl -s http://localhost:8001/api/companies/a17cc179-df90-4f56-a5f9-21ccd232f9f5/account-mappings \
  -H "Authorization: Bearer <TOKEN>" | python -c "
import json, sys
data = json.load(sys.stdin)
for m in data['mappings'][:20]:
    print(f\"{m['account_number']:10s} {m.get('link_code',''):15s} {m['description']}\")
"
```
Expected: Understand which accounts map to which link codes

---

### Task 4: Create and seed statement structures

Based on discovered link_codes, create three statement structures.

**Step 1: Create income statement structure**

Build a JSON structure matching the default layout from the FS mapping page, adding `linkCode` for each row based on discovered codes. Example structure:

```json
{
  "structure": [
    {"id": "revenus", "label": "revenus", "isBold": true, "isSection": true, "linkCode": "<DISCOVERED_CODE>"},
    {"id": "cpv", "label": "coût des produits vendus", "isSection": true, "linkCode": "<DISCOVERED_CODE>"},
    {"id": "benefice-brut", "label": "bénéfice brut", "isBold": true, "isResult": true, "formula": ["+revenus", "-cpv"]},
    {"id": "charges", "label": "charges d'exploitation", "isBold": true, "isSection": true, "children": [
      {"id": "admin", "label": "frais d'administration", "linkCode": "<DISCOVERED_CODE>"},
      {"id": "vente", "label": "frais de vente", "linkCode": "<DISCOVERED_CODE>"},
      {"id": "amort", "label": "amortissement", "linkCode": "<DISCOVERED_CODE>"},
      {"id": "autres", "label": "autres dépenses (revenus)", "linkCode": "<DISCOVERED_CODE>"}
    ]},
    {"id": "bai", "label": "bénéfice avant impôts", "isBold": true, "isResult": true, "formula": ["+benefice-brut", "-charges"]},
    {"id": "impots", "label": "impôts", "linkCode": "<DISCOVERED_CODE>"},
    {"id": "benefice-net", "label": "bénéfice net", "isBold": true, "isResult": true, "formula": ["+bai", "-impots"]},
    {"id": "baiia", "label": "BAIIA", "isBold": true, "isResult": true, "formula": ["+benefice-net", "+amort", "+impots"]}
  ]
}
```

**Step 2: PUT income statement via API**
```bash
curl -s -X PUT http://localhost:8001/api/companies/a17cc179-df90-4f56-a5f9-21ccd232f9f5/statement-structures/income-statement \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '<JSON_BODY>'
```

**Step 3: Create and PUT balance sheet structure**

Similar pattern with actifs courants, actifs non courants, total des actifs, passifs courants, passifs non courants, total des passifs, capitaux propres, total passifs et capitaux propres.

**Step 4: Create and PUT cash flow structure**

Structure with: activités opérationnelles (exploitation), activités d'investissement (investissement), activités de financement (financement), variation de trésorerie (flux net).

---

### Task 5: Verify financial statement API returns data

**Step 1: Test income statement endpoint**
```bash
curl -s "http://localhost:8001/api/companies/a17cc179-df90-4f56-a5f9-21ccd232f9f5/financial-statements/income-statement?fiscal_year=2025&month=3" \
  -H "Authorization: Bearer <TOKEN>" | python -m json.tool
```
Expected: `rows` array with actual `current` values (not all zeros)

**Step 2: Test balance sheet endpoint**
```bash
curl -s "http://localhost:8001/api/companies/a17cc179-df90-4f56-a5f9-21ccd232f9f5/financial-statements/balance-sheet?fiscal_year=2025&month=3" \
  -H "Authorization: Bearer <TOKEN>" | python -m json.tool
```

**Step 3: Test series endpoint**
```bash
curl -s "http://localhost:8001/api/companies/a17cc179-df90-4f56-a5f9-21ccd232f9f5/financial-statements/income-statement/series?fiscal_year=2025&months=12" \
  -H "Authorization: Bearer <TOKEN>" | python -m json.tool
```
Expected: `rows` with `amounts` per period

**Step 4: Test summary endpoint (dashboard KPIs)**
```bash
curl -s "http://localhost:8001/api/companies/a17cc179-df90-4f56-a5f9-21ccd232f9f5/financial-statements/summary?fiscal_year=2025&month=3" \
  -H "Authorization: Bearer <TOKEN>" | python -m json.tool
```

---

### Task 6: Verify frontend pages with Playwright

**Step 1: Navigate to login and authenticate**
- Go to `http://localhost:3000`
- Login with `playwright@modelisys.com` / `PlaywrightTest123`

**Step 2: Check dashboard**
- Navigate to `/dashboard`
- Verify KPI cards show real numbers (not "N/A" or "$0")

**Step 3: Check income statement page**
- Navigate to `/financial-statements/income-statement`
- Verify table shows rows with amounts

**Step 4: Check balance sheet page**
- Navigate to `/financial-statements/balance-sheet`
- Verify table shows rows with amounts

**Step 5: Check analysis pages**
- Navigate to `/analysis/capex` - should show capex analysis
- Navigate to `/analysis/seasonality` - should show seasonality data
- Navigate to `/analysis/working-capital` - should show working capital

**Step 6: Take screenshots for evidence**

---

### Task 7: Fix any issues found during verification

Address any bugs or missing data discovered during Tasks 5-6.

---

### Task 8: Commit all changes

**Step 1: Review changes**
```bash
git status
git diff --stat
```

**Step 2: Stage and commit**
```bash
git add -A
git commit -m "feat: seed statement structures and verify full data pipeline"
```
