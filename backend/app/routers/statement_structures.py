import csv
import io
import uuid
from itertools import groupby

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.user import User, UserOrganization
from app.schemas.statement_structure import (
    StatementStructureListResponse,
    StatementStructureResponse,
    StatementStructureUpsert,
)

router = APIRouter(prefix="/api/companies/{company_id}", tags=["statement-structures"])

VALID_STATEMENT_TYPES = {"income-statement", "balance-sheet", "cash-flow", "capex", "baiia"}

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
    {"label": "frais financiers", "indent": True},
    {"label": "autres dépenses (revenus)", "indent": True},
    {"label": "total des charges", "isBold": True},
    {"label": ""},
    {"label": "bénéfice avant impôts", "isBold": True, "isResult": True},
    {"label": "impôts (26%)", "indent": True},
    {"label": "bénéfice net", "isBold": True, "isNetIncome": True},
    {"label": ""},
    {"label": "BAIIA", "isBold": True, "isEBITA": True},
]


def _verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    memberships = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).all()
    org_ids = {m.organization_id for m in memberships}

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or company.organization_id not in org_ids:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("/statement-structures", response_model=StatementStructureListResponse)
def list_statement_structures(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_company_access(db, current_user, company_id)
    structures = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company_id)
        .order_by(CompanyStatementStructure.statement_type)
        .all()
    )
    return StatementStructureListResponse(structures=structures)


@router.get("/statement-structures/{statement_type}", response_model=StatementStructureResponse)
def get_statement_structure(
    company_id: uuid.UUID,
    statement_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if statement_type not in VALID_STATEMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid statement type: {statement_type}")

    _verify_company_access(db, current_user, company_id)

    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )
    if not structure:
        raise HTTPException(status_code=404, detail="Statement structure not found")
    return structure


@router.put("/statement-structures/{statement_type}", response_model=StatementStructureResponse)
def upsert_statement_structure(
    company_id: uuid.UUID,
    statement_type: str,
    request: StatementStructureUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if statement_type not in VALID_STATEMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid statement type: {statement_type}")

    _verify_company_access(db, current_user, company_id)

    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )

    if structure:
        structure.structure = request.structure
    else:
        structure = CompanyStatementStructure(
            company_id=company_id,
            statement_type=statement_type,
            structure=request.structure,
        )
        db.add(structure)

    db.commit()
    db.refresh(structure)
    return structure


# ---------------------------------------------------------------------------
# CSV Import helpers
# ---------------------------------------------------------------------------


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
    for i, row in enumerate(structure):
        if row.get("label", "").lower() == label.lower():
            return i
    return -1


def _get_existing_labels(structure, start_idx, end_idx):
    labels = set()
    for i in range(start_idx, min(end_idx, len(structure))):
        row = structure[i]
        if row.get("doubleIndent") or (row.get("indent") and not row.get("isSection") and not row.get("isResult")):
            labels.add(row.get("label", "").lower())
    return labels


def _get_existing_detail_labels(row):
    labels = set()
    for detail in row.get("detailRows", []):
        labels.add(detail.get("label", "").lower())
    return labels


def _merge_balance_sheet(structure, rows):
    added = 0
    rows_sorted = sorted(rows, key=lambda r: (r["categorie"], r["type"], r["classement"]))

    for (cat, typ), group in groupby(rows_sorted, key=lambda r: (r["categorie"], r["type"])):
        items = list(group)

        if cat == "capitaux propres":
            section_idx = _find_row_index(structure, "capitaux propres")
            if section_idx == -1:
                continue
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
            subsection_label = TYPE_TO_BALANCE_SUBSECTION.get((cat, typ))
            if not subsection_label:
                continue
            section_idx = _find_row_index(structure, subsection_label)
            if section_idx == -1:
                continue
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
    added = 0
    rows_sorted = sorted(rows, key=lambda r: (r["categorie"], r["type"], r["classement"]))

    for row_data in rows_sorted:
        cat = row_data["categorie"]
        typ = row_data["type"]
        nom = row_data["nom"]

        if cat == "revenus":
            parent_label = "revenus"
        elif cat == "coûts des produits vendus":
            parent_label = "coût des produits vendus"
        elif cat == "charges":
            parent_label = CHARGES_TYPE_TO_PARENT.get(typ, "frais d'administration")
        elif cat == "impôts":
            parent_label = None
            for s_row in structure:
                if "impôt" in s_row.get("label", "").lower():
                    parent_label = s_row["label"]
                    break
            if not parent_label:
                continue
        else:
            continue

        parent_idx = _find_row_index(structure, parent_label)
        if parent_idx == -1:
            continue

        parent_row = structure[parent_idx]
        if "detailRows" not in parent_row:
            parent_row["detailRows"] = []

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


# ---------------------------------------------------------------------------
# CSV Import endpoint
# ---------------------------------------------------------------------------


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
    text = None
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if text is None:
        raise HTTPException(status_code=400, detail="Unable to decode CSV file")

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

    # Parse data rows
    parsed_rows = []
    for row in rows_raw[header_idx + 1:]:
        cells = [c.strip() for c in row]
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

    balance_rows = [r for r in parsed_rows if r["categorie"] in BALANCE_SHEET_CATEGORIES]
    income_rows = [r for r in parsed_rows if r["categorie"] in INCOME_STATEMENT_CATEGORIES]

    bs_structure = _get_or_default_structure(db, company_id, "balance-sheet", DEFAULT_BALANCE_SHEET)
    bs_added = _merge_balance_sheet(bs_structure, balance_rows)

    is_structure = _get_or_default_structure(db, company_id, "income-statement", DEFAULT_INCOME_STATEMENT)
    is_added = _merge_income_statement(is_structure, income_rows)

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
