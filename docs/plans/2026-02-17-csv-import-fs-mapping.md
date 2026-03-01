# CSV Import for Financial Statement Mappings

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to import a CSV file with columns (Nom de compte, Catégories, Types, Classement) to merge rows into the existing income statement and balance sheet structures.

**Architecture:** New backend endpoint parses CSV and merges rows into existing `CompanyStatementStructure` JSON. Frontend adds an "Importer CSV" button with file picker on the existing FS mapping page. The CSV is parsed server-side with encoding auto-detection (UTF-8/Latin-1).

**Tech Stack:** FastAPI (UploadFile), Python csv module, chardet for encoding detection, React file input dialog

---

## CSV Format Reference

```
,,,,
,,,,
,Nom de compte,Catégories,Types,Classement
,Encaisse,Actif,Court terme,1
,Débiteurs,Actif,Court terme,2
...
```

- First column is empty (offset by 1)
- First 2 rows are empty, row 3 is header
- Catégories: Actif, Passif, Capitaux propres, Revenus, Coûts des produits vendus, Charges, Impôts
- Types: Court terme, Long terme, Frais d'administration, Frais financiers, n/a
- Classement: integer sort order within (Catégorie, Type) group

## Category → Structure Mapping

### Balance Sheet (balance-sheet)
| Catégorie | Section | Sub-section (from Type) |
|---|---|---|
| Actif | actifs | Court terme → actifs courants, Long terme → actifs non courants |
| Passif | passifs | Court terme → passifs courants, Long terme → passifs non courants |
| Capitaux propres | capitaux propres | — (direct children) |

### Income Statement (income-statement)
| Catégorie | Parent row | Notes |
|---|---|---|
| Revenus | revenus | Added as detailRows on the "revenus" row |
| Coûts des produits vendus | coût des produits vendus | Added as detailRows |
| Charges | frais d'administration / frais de vente / (new sub-section) | Type determines which sub-section; added as detailRows |
| Impôts | impôts (26%) | Added as detailRows |

### Merge Logic
- For balance sheet: insert as `doubleIndent: true` rows under the matching sub-section
- For income statement: insert as `detailRows` on the matching parent row
- Skip rows whose label already exists in the target section (case-insensitive)
- Sort by Classement within each group

---

### Task 1: Backend — CSV Import Endpoint

**Files:**
- Modify: `backend/app/routers/statement_structures.py`
- Modify: `backend/app/schemas/statement_structure.py`

**Step 1: Add response schema**

In `backend/app/schemas/statement_structure.py`, add:

```python
class CSVImportResponse(BaseModel):
    income_statement_rows_added: int
    balance_sheet_rows_added: int
    skipped: int
    message: str
```

**Step 2: Add the CSV import endpoint**

In `backend/app/routers/statement_structures.py`, add a new endpoint after the existing ones:

```python
import csv
import io
from fastapi import UploadFile, File

# Category mapping constants
BALANCE_SHEET_CATEGORIES = {"actif", "passif", "capitaux propres"}
INCOME_STATEMENT_CATEGORIES = {"revenus", "coûts des produits vendus", "charges", "impôts"}

TYPE_TO_BALANCE_SUBSECTION = {
    ("actif", "court terme"): "actifs courants",
    ("actif", "long terme"): "actifs non courants",
    ("passif", "court terme"): "passifs courants",
    ("passif", "long terme"): "passifs non courants",
}

CHARGES_TYPE_TO_PARENT = {
    "frais d'administration": "frais d'administration",
    "frais de vente": "frais de vente",
    "frais financiers": "frais financiers",
}


@router.post("/statement-structures/import-csv")
async def import_csv_statement_structure(
    company_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_company_access(db, current_user, company_id)

    content = await file.read()

    # Try UTF-8 first, fall back to Latin-1
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(status_code=400, detail="Unable to decode CSV file")

    # Parse CSV
    reader = csv.reader(io.StringIO(text))
    rows_raw = list(reader)

    # Find header row (contains "Nom de compte")
    header_idx = None
    for i, row in enumerate(rows_raw):
        for cell in row:
            if "nom de compte" in cell.lower():
                header_idx = i
                break
        if header_idx is not None:
            break

    if header_idx is None:
        raise HTTPException(status_code=400, detail="Header row with 'Nom de compte' not found")

    # Parse data rows (after header)
    parsed_rows = []
    for row in rows_raw[header_idx + 1:]:
        # Find the non-empty cells (CSV has offset empty first column)
        cells = [c.strip() for c in row]
        # Remove leading empty cells
        while cells and cells[0] == "":
            cells = cells[1:]
        if len(cells) < 4:
            continue
        nom, categorie, type_val, classement = cells[0], cells[1], cells[2], cells[3]
        if not nom or not categorie:
            continue
        try:
            order = int(classement)
        except (ValueError, TypeError):
            order = 999
        parsed_rows.append({
            "nom": nom,
            "categorie": categorie.lower(),
            "type": type_val.lower() if type_val else "n/a",
            "classement": order,
        })

    # Group by category
    balance_rows = [r for r in parsed_rows if r["categorie"] in BALANCE_SHEET_CATEGORIES]
    income_rows = [r for r in parsed_rows if r["categorie"] in INCOME_STATEMENT_CATEGORIES]

    # --- Merge into Balance Sheet ---
    bs_structure = _get_or_default_structure(db, company_id, "balance-sheet", DEFAULT_BALANCE_SHEET)
    bs_added = _merge_balance_sheet(bs_structure, balance_rows)

    # --- Merge into Income Statement ---
    is_structure = _get_or_default_structure(db, company_id, "income-statement", DEFAULT_INCOME_STATEMENT)
    is_added = _merge_income_statement(is_structure, income_rows)

    # Save both structures
    _save_structure(db, company_id, "balance-sheet", bs_structure)
    _save_structure(db, company_id, "income-statement", is_structure)
    db.commit()

    total = len(parsed_rows)
    added = bs_added + is_added
    skipped = total - added

    return {
        "income_statement_rows_added": is_added,
        "balance_sheet_rows_added": bs_added,
        "skipped": skipped,
        "message": f"{added} rows imported ({bs_added} balance sheet, {is_added} income statement), {skipped} skipped",
    }
```

**Step 3: Add helper functions**

Add these helpers above the endpoint:

```python
DEFAULT_BALANCE_SHEET = [
    {"label": "actifs", "isBold": True, "isSection": True},
    {"label": "actifs courants", "isSection": True, "indent": True},
    {"label": "actifs non courants", "isSection": True, "indent": True},
    {"label": "total des actifs", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "passifs", "isBold": True, "isSection": True},
    {"label": "passifs courants", "indent": True},
    {"label": "passifs non courants", "indent": True},
    {"label": "total des passifs", "isBold": True},
    {"label": ""},
    {"label": "capitaux propres", "isBold": True, "isResult": True},
    {"label": "total passifs et capitaux propres", "isBold": True, "isResult": True},
]

DEFAULT_INCOME_STATEMENT = [
    {"label": "revenus", "isBold": True, "isSection": True},
    {"label": "coût des produits vendus", "isSection": True, "indent": True},
    {"label": "bénéfice brut", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "charges d'exploitation", "isBold": True, "isSection": True},
    {"label": "frais d'administration", "indent": True},
    {"label": "frais de vente", "indent": True},
    {"label": "autres dépenses (revenus)", "indent": True},
    {"label": "total des charges", "isBold": True},
    {"label": ""},
    {"label": "bénéfice avant impôts", "isBold": True, "isResult": True},
    {"label": "impôts (26%)", "indent": True},
    {"label": "bénéfice net", "isBold": True, "isNetIncome": True},
    {"label": ""},
    {"label": "BAIIA", "isBold": True, "isEBITA": True},
]


def _get_or_default_structure(db, company_id, statement_type, default):
    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )
    if structure and structure.structure:
        return list(structure.structure)
    return [dict(row) for row in default]


def _save_structure(db, company_id, statement_type, structure):
    existing = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )
    if existing:
        existing.structure = structure
    else:
        db.add(CompanyStatementStructure(
            company_id=company_id,
            statement_type=statement_type,
            structure=structure,
        ))


def _find_row_index(structure, label):
    """Find index of row by label (case-insensitive)."""
    for i, row in enumerate(structure):
        if row.get("label", "").lower() == label.lower():
            return i
    return -1


def _get_existing_labels(structure, start_idx, end_idx):
    """Get set of labels (lowercase) between start and end indices (for doubleIndent rows)."""
    labels = set()
    for i in range(start_idx, min(end_idx, len(structure))):
        row = structure[i]
        if row.get("doubleIndent") or (row.get("indent") and not row.get("isSection") and not row.get("isResult")):
            labels.add(row.get("label", "").lower())
    return labels


def _get_existing_detail_labels(row):
    """Get set of detail row labels (lowercase) for a row."""
    labels = set()
    for detail in row.get("detailRows", []):
        labels.add(detail.get("label", "").lower())
    return labels


def _merge_balance_sheet(structure, rows):
    """Merge CSV rows into balance sheet structure. Returns count of rows added."""
    added = 0
    # Group by (categorie, type), sorted by classement
    from itertools import groupby
    rows_sorted = sorted(rows, key=lambda r: (r["categorie"], r["type"], r["classement"]))

    for (cat, typ), group in groupby(rows_sorted, key=lambda r: (r["categorie"], r["type"])):
        items = list(group)

        if cat == "capitaux propres":
            # Insert under "capitaux propres" section
            section_idx = _find_row_index(structure, "capitaux propres")
            if section_idx == -1:
                continue
            # Find the end of this section (next spacer or "total passifs...")
            end_idx = len(structure)
            for i in range(section_idx + 1, len(structure)):
                if structure[i].get("label", "") == "" or structure[i].get("label", "").lower() == "total passifs et capitaux propres":
                    end_idx = i
                    break
            existing = _get_existing_labels(structure, section_idx + 1, end_idx)
            insert_at = end_idx
            for item in items:
                if item["nom"].lower() not in existing:
                    structure.insert(insert_at, {
                        "label": item["nom"],
                        "indent": True,
                        "doubleIndent": True,
                    })
                    insert_at += 1
                    added += 1
        else:
            # Find sub-section
            subsection_label = TYPE_TO_BALANCE_SUBSECTION.get((cat, typ))
            if not subsection_label:
                continue
            section_idx = _find_row_index(structure, subsection_label)
            if section_idx == -1:
                continue
            # Find end of sub-section (next section, result, spacer, or non-doubleIndent row)
            end_idx = section_idx + 1
            for i in range(section_idx + 1, len(structure)):
                row = structure[i]
                label_lower = row.get("label", "").lower()
                if (row.get("label", "") == "" or
                    row.get("isSection") or
                    row.get("isResult") or
                    row.get("isBold") or
                    label_lower in ("passifs courants", "passifs non courants", "total des passifs",
                                    "actifs courants", "actifs non courants", "total des actifs",
                                    "capitaux propres", "total passifs et capitaux propres")):
                    end_idx = i
                    break
                end_idx = i + 1
            existing = _get_existing_labels(structure, section_idx + 1, end_idx)
            insert_at = end_idx
            for item in items:
                if item["nom"].lower() not in existing:
                    structure.insert(insert_at, {
                        "label": item["nom"],
                        "indent": True,
                        "doubleIndent": True,
                    })
                    insert_at += 1
                    added += 1

    return added


def _merge_income_statement(structure, rows):
    """Merge CSV rows into income statement structure as detailRows. Returns count added."""
    added = 0
    rows_sorted = sorted(rows, key=lambda r: (r["categorie"], r["type"], r["classement"]))

    for row_data in rows_sorted:
        cat = row_data["categorie"]
        typ = row_data["type"]
        nom = row_data["nom"]

        # Determine parent row label
        if cat == "revenus":
            parent_label = "revenus"
        elif cat == "coûts des produits vendus":
            parent_label = "coût des produits vendus"
        elif cat == "charges":
            parent_label = CHARGES_TYPE_TO_PARENT.get(typ)
            if not parent_label:
                parent_label = "frais d'administration"  # Default fallback
        elif cat == "impôts":
            # Find the impôts row (may be "impôts (26%)" or similar)
            parent_label = None
            for s_row in structure:
                if "impôt" in s_row.get("label", "").lower():
                    parent_label = s_row["label"]
                    break
            if not parent_label:
                continue
        else:
            continue

        # Find parent row
        parent_idx = _find_row_index(structure, parent_label)
        if parent_idx == -1:
            continue

        parent_row = structure[parent_idx]

        # Initialize detailRows if needed
        if "detailRows" not in parent_row:
            parent_row["detailRows"] = []

        # Check for duplicate
        existing = _get_existing_detail_labels(parent_row)
        if nom.lower() in existing:
            continue

        parent_row["detailRows"].append({
            "label": nom,
            "indent": True,
        })
        parent_row["isExpanded"] = True
        added += 1

    return added
```

**Step 4: Run backend tests**

```bash
cd backend && python -m pytest tests/test_statement_structures.py -v
```

Expected: All existing tests PASS.

**Step 5: Commit**

```bash
git add backend/app/routers/statement_structures.py backend/app/schemas/statement_structure.py
git commit -m "feat: add CSV import endpoint for financial statement mappings"
```

---

### Task 2: Backend Tests for CSV Import

**Files:**
- Modify: `backend/tests/test_statement_structures.py`

**Step 1: Write CSV import tests**

Add to `backend/tests/test_statement_structures.py`:

```python
import io

def _make_csv(rows_data):
    """Helper to create a CSV file matching the expected format."""
    lines = [",,,,\n", ",,,,\n", ",Nom de compte,Catégories,Types,Classement\n"]
    for nom, cat, typ, classement in rows_data:
        lines.append(f",{nom},{cat},{typ},{classement}\n")
    return "".join(lines).encode("utf-8")


def test_csv_import_balance_sheet(client, auth_headers):
    """CSV rows for Actif/Passif/Capitaux propres merge into balance sheet."""
    company_id = _create_company(client, auth_headers)
    csv_data = _make_csv([
        ("Encaisse", "Actif", "Court terme", "1"),
        ("Débiteurs", "Actif", "Court terme", "2"),
        ("Immobilisations corporelles", "Actif", "Long terme", "1"),
        ("Marge de crédit", "Passif", "Court terme", "1"),
        ("Dette à long terme", "Passif", "Long terme", "1"),
        ("Capital-action", "Capitaux propres", "n/a", "1"),
    ])
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["balance_sheet_rows_added"] == 6
    assert data["income_statement_rows_added"] == 0

    # Verify balance sheet structure was created
    bs = client.get(
        f"/api/companies/{company_id}/statement-structures/balance-sheet",
        headers=auth_headers,
    )
    assert bs.status_code == 200
    labels = [r["label"].lower() for r in bs.json()["structure"]]
    assert "encaisse" in labels
    assert "débiteurs" in labels
    assert "immobilisations corporelles" in labels


def test_csv_import_income_statement(client, auth_headers):
    """CSV rows for Revenus/Charges/Impôts merge as detailRows."""
    company_id = _create_company(client, auth_headers)
    csv_data = _make_csv([
        ("Revenus de développement", "Revenus", "n/a", "1"),
        ("Revenus de licences", "Revenus", "n/a", "2"),
        ("Main-d'oeuvre directe", "Coûts des produits vendus", "n/a", "1"),
        ("Salaires administratifs", "Charges", "Frais d'administration", "1"),
        ("Intérêts bancaires", "Charges", "Frais financiers", "1"),
        ("Impôts", "Impôts", "n/a", "1"),
    ])
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["income_statement_rows_added"] == 6

    # Verify income statement detailRows
    is_resp = client.get(
        f"/api/companies/{company_id}/statement-structures/income-statement",
        headers=auth_headers,
    )
    assert is_resp.status_code == 200
    structure = is_resp.json()["structure"]
    revenus_row = next(r for r in structure if r.get("label", "").lower() == "revenus")
    assert len(revenus_row["detailRows"]) == 2
    assert revenus_row["isExpanded"] is True


def test_csv_import_merge_no_duplicates(client, auth_headers):
    """Importing the same CSV twice should not create duplicates."""
    company_id = _create_company(client, auth_headers)
    csv_data = _make_csv([
        ("Encaisse", "Actif", "Court terme", "1"),
        ("Revenus de licences", "Revenus", "n/a", "1"),
    ])
    # Import twice
    client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["balance_sheet_rows_added"] == 0
    assert response.json()["income_statement_rows_added"] == 0
    assert response.json()["skipped"] == 2


def test_csv_import_latin1_encoding(client, auth_headers):
    """CSV with Latin-1 encoding should be handled."""
    company_id = _create_company(client, auth_headers)
    csv_text = ",,,,\n,,,,\n,Nom de compte,Catégories,Types,Classement\n,Débiteurs,Actif,Court terme,1\n"
    csv_bytes = csv_text.encode("latin-1")
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(csv_bytes), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["balance_sheet_rows_added"] == 1


def test_csv_import_invalid_file(client, auth_headers):
    """Non-CSV content should return 400."""
    company_id = _create_company(client, auth_headers)
    response = client.post(
        f"/api/companies/{company_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(b"not a csv at all"), "text/csv")},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_csv_import_unauthenticated(client):
    """Unauthenticated request should return 403."""
    fake_id = str(uuid.uuid4())
    response = client.post(
        f"/api/companies/{fake_id}/statement-structures/import-csv",
        files={"file": ("test.csv", io.BytesIO(b"data"), "text/csv")},
    )
    assert response.status_code == 403
```

**Step 2: Run tests**

```bash
cd backend && python -m pytest tests/test_statement_structures.py -v
```

Expected: All tests PASS.

**Step 3: Commit**

```bash
git add backend/tests/test_statement_structures.py
git commit -m "test: add CSV import tests for statement structures"
```

---

### Task 3: Frontend — API Client Function

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add the upload function**

After the `upsertStatementStructure` function (around line 447), add:

```typescript
export interface CSVImportResponse {
  income_statement_rows_added: number
  balance_sheet_rows_added: number
  skipped: number
  message: string
}

export async function importStatementStructureCSV(
  companyId: string,
  file: File
): Promise<CSVImportResponse> {
  const formData = new FormData()
  formData.append("file", file)
  return apiFetch<CSVImportResponse>(
    `/api/companies/${companyId}/statement-structures/import-csv`,
    { method: "POST", body: formData }
  )
}
```

**Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add importStatementStructureCSV API client function"
```

---

### Task 4: Frontend — Import CSV Button and Dialog

**Files:**
- Modify: `frontend/app/settings/companies/[id]/financial-statements-mapping/page.tsx`

**Step 1: Add import to top of file**

Add `Upload` to the lucide-react imports and add the new API function:

```typescript
import { ArrowLeft, Edit2, X, Check, Plus, ChevronUp, ChevronDown, Trash2, ChevronRight, Loader2, Upload } from "lucide-react"
```

Add to the API imports:

```typescript
import {
  getCompany,
  getStatementStructure,
  upsertStatementStructure,
  importStatementStructureCSV,
  type Company as ApiCompany,
  type StatementType,
} from "@/lib/api"
```

**Step 2: Add state variables and handler**

Inside the component, after the existing state declarations (around line 78), add:

```typescript
const [importing, setImporting] = useState(false)
const [importResult, setImportResult] = useState<string | null>(null)
```

Add the handler function after `saveBalanceSheetRows`:

```typescript
const handleImportCSV = useCallback(async (file: File) => {
  setImporting(true)
  setImportResult(null)
  try {
    const result = await importStatementStructureCSV(companyId, file)
    setImportResult(result.message)

    // Reload both structures
    try {
      const isData = await getStatementStructure(companyId, "income-statement")
      if (isData.structure && Array.isArray(isData.structure) && isData.structure.length > 0) {
        setFinancialStatementRows(ensureCogsOrder(isData.structure as unknown as FinancialStatementRow[]))
      }
    } catch { /* keep current */ }

    try {
      const bsData = await getStatementStructure(companyId, "balance-sheet")
      if (bsData.structure && Array.isArray(bsData.structure) && bsData.structure.length > 0) {
        setBalanceSheetRows(bsData.structure as unknown as BalanceSheetRow[])
      }
    } catch { /* keep current */ }
  } catch (e) {
    setImportResult("Erreur lors de l'importation du fichier CSV")
    console.error("CSV import error:", e)
  } finally {
    setImporting(false)
  }
}, [companyId])
```

**Step 3: Add the Import button in the Controls Section**

In the controls section (around line 846), add an "Importer CSV" button after the existing toggle buttons. Find the closing `</div>` of the flex container with the toggle groups and add before it:

```tsx
{/* Import CSV Button */}
<div className="flex items-center gap-2 ml-auto">
  <label className="cursor-pointer">
    <input
      type="file"
      accept=".csv"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) {
          handleImportCSV(file)
          e.target.value = ""
        }
      }}
      disabled={importing}
    />
    <div className={`inline-flex items-center gap-2 h-8 px-4 rounded-lg text-xs font-medium transition-all ${
      importing
        ? "bg-slate-700 text-slate-400 cursor-wait"
        : "bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
    }`}>
      {importing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Upload className="w-3.5 h-3.5" />
      )}
      Importer CSV
    </div>
  </label>
</div>
```

**Step 4: Add import result alert**

Below the controls section div (after the closing `</div>` at ~line 918), add:

```tsx
{importResult && (
  <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-between">
    <span className="text-sm text-emerald-200">{importResult}</span>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setImportResult(null)}
      className="h-6 w-6 p-0 text-emerald-300 hover:text-white hover:bg-emerald-500/30"
    >
      <X className="w-3.5 h-3.5" />
    </Button>
  </div>
)}
```

**Step 5: Commit**

```bash
git add frontend/app/settings/companies/[id]/financial-statements-mapping/page.tsx
git commit -m "feat: add CSV import button to financial statements mapping page"
```

---

### Task 5: Playwright E2E Test

**Files:**
- Create: `frontend/e2e/fs-mapping-csv-import.spec.ts`

**Step 1: Write the E2E test**

```typescript
import { test, expect } from "@playwright/test"
import path from "path"
import fs from "fs"
import os from "os"

const BASE_URL = "http://localhost:3000"
const TEST_EMAIL = "playwright@modelisys.com"
const TEST_PASSWORD = "PlaywrightTest123"
const COMPANY_ID = "a17cc179-df90-4f56-a5f9-21ccd232f9f5"

test.describe("Financial Statement Mapping CSV Import", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/.*(?!login).*/)
  })

  test("should show import CSV button on FS mapping page", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/companies/${COMPANY_ID}/financial-statements-mapping`)
    await page.waitForLoadState("networkidle")
    await expect(page.getByText("Importer CSV")).toBeVisible()
  })

  test("should import CSV and show success message", async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/companies/${COMPANY_ID}/financial-statements-mapping`)
    await page.waitForLoadState("networkidle")

    // Create a test CSV file
    const csvContent = [
      ",,,,",
      ",,,,",
      ",Nom de compte,Catégories,Types,Classement",
      ",Test Encaisse E2E,Actif,Court terme,1",
      ",Test Revenus E2E,Revenus,n/a,1",
    ].join("\n")

    const tmpDir = os.tmpdir()
    const csvPath = path.join(tmpDir, "test-fs-mapping.csv")
    fs.writeFileSync(csvPath, csvContent, "utf-8")

    // Upload the file
    const fileInput = page.locator('input[type="file"][accept=".csv"]')
    await fileInput.setInputFiles(csvPath)

    // Wait for success message
    await expect(page.getByText(/rows imported/i)).toBeVisible({ timeout: 10000 })

    // Cleanup
    fs.unlinkSync(csvPath)
  })
})
```

**Step 2: Run E2E test**

```bash
cd frontend && pnpm test:e2e -- --grep "CSV Import"
```

**Step 3: Commit**

```bash
git add frontend/e2e/fs-mapping-csv-import.spec.ts
git commit -m "test: add Playwright E2E test for CSV import on FS mapping page"
```

---

### Task 6: Final Verification

**Step 1: Run all backend tests**

```bash
cd backend && python -m pytest -v
```

**Step 2: Run all E2E tests**

```bash
cd frontend && pnpm test:e2e
```

**Step 3: Manual test with actual CSV**

1. Navigate to Settings > Companies > [company] > Mapping états financiers
2. Click "Importer CSV"
3. Select the `Code de liaison.xlsx - Info.csv` file
4. Verify success message shows counts
5. Check Balance Sheet tab — new rows should appear under their sections
6. Check Income Statement Detail view — expand revenus, charges, etc. to see imported detail rows
7. Import same file again — verify "0 rows imported, N skipped"
