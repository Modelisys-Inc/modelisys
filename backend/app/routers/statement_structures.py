import csv
import io
import uuid
from itertools import groupby

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.company import Company
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.user import User
from app.schemas.statement_structure import (
    StatementStructureListResponse,
    StatementStructureResponse,
    StatementStructureUpsert,
)
from app.services.statement_template import get_default_structure
from app.services.standard_link_code_utils import ensure_net_income_in_balance_structure
from app.utils.income_statement_structure_clean import strip_obsolete_income_statement_structure_rows

router = APIRouter(prefix="/api/companies/{company_id}", tags=["statement-structures"])

VALID_STATEMENT_TYPES = {
    "income-statement",
    "balance-sheet",
    "cash-flow",
    "cash-flow-detail",
    "working-capital",
    "capex",
    "ratios",
    "baiia",
}

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


@router.get("/statement-structures", response_model=StatementStructureListResponse)
def list_statement_structures(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verify_company_access(db, current_user, company_id)
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

    verify_company_access(db, current_user, company_id)

    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )
    if not structure:
        # Return the standard default structure instead of 404 / empty.
        default_rows = get_default_structure(db, statement_type)
        if statement_type == "balance-sheet":
            default_rows = ensure_net_income_in_balance_structure(default_rows, db)
        return StatementStructureResponse(
            id=None,
            company_id=company_id,
            statement_type=statement_type,
            structure=default_rows,
        )
    if statement_type == "income-statement" and structure.structure:
        cleaned = strip_obsolete_income_statement_structure_rows(list(structure.structure))
        return StatementStructureResponse(
            id=structure.id,
            company_id=structure.company_id,
            statement_type=structure.statement_type,
            structure=cleaned,
        )
    if statement_type == "balance-sheet" and structure.structure:
        ensured = ensure_net_income_in_balance_structure(list(structure.structure), db)
        return StatementStructureResponse(
            id=structure.id,
            company_id=structure.company_id,
            statement_type=structure.statement_type,
            structure=ensured,
        )
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

    verify_company_access(db, current_user, company_id)

    to_store = request.structure
    if statement_type == "income-statement":
        to_store = strip_obsolete_income_statement_structure_rows(list(request.structure or []))

    structure = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == statement_type,
        )
        .first()
    )

    if structure:
        structure.structure = to_store
    else:
        structure = CompanyStatementStructure(
            company_id=company_id,
            statement_type=statement_type,
            structure=to_store,
        )
        db.add(structure)

    db.commit()
    db.refresh(structure)
    return structure


# ---------------------------------------------------------------------------
# CSV Import helpers
# ---------------------------------------------------------------------------


def _get_or_default_structure(db, company_id, statement_type):
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
    return get_default_structure(db, statement_type)


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
    skipped = []
    rows_sorted = sorted(rows, key=lambda r: (r["categorie"], r["type"], r["classement"]))

    for (cat, typ), group in groupby(rows_sorted, key=lambda r: (r["categorie"], r["type"])):
        items = list(group)

        if cat == "capitaux propres":
            section_idx = _find_row_index(structure, "capitaux propres")
            if section_idx == -1:
                for item in items:
                    skipped.append({"nom": item["nom"], "reason": "Section 'capitaux propres' introuvable"})
                continue
            end_idx = len(structure)
            for i in range(section_idx + 1, len(structure)):
                if structure[i].get("label", "") == "" or structure[i].get("label", "").lower() == "total passifs et capitaux propres":
                    end_idx = i
                    break
            existing = _get_existing_labels(structure, section_idx + 1, end_idx)
            insert_at = end_idx
            for item in items:
                if item["nom"].lower() in existing:
                    skipped.append({"nom": item["nom"], "reason": "Doublon (capitaux propres)"})
                else:
                    new_row = {
                        "label": item["nom"],
                        "indent": True,
                        "doubleIndent": True,
                    }
                    if item.get("linkCode"):
                        new_row["linkCode"] = item["linkCode"]
                    structure.insert(insert_at, new_row)
                    insert_at += 1
                    added += 1
        else:
            subsection_label = TYPE_TO_BALANCE_SUBSECTION.get((cat, typ))
            if not subsection_label:
                for item in items:
                    skipped.append({"nom": item["nom"], "reason": f"Type '{typ}' non reconnu pour '{cat}'"})
                continue
            section_idx = _find_row_index(structure, subsection_label)
            if section_idx == -1:
                for item in items:
                    skipped.append({"nom": item["nom"], "reason": f"Section '{subsection_label}' introuvable"})
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
                if item["nom"].lower() in existing:
                    skipped.append({"nom": item["nom"], "reason": f"Doublon ({subsection_label})"})
                else:
                    new_row = {
                        "label": item["nom"],
                        "indent": True,
                        "doubleIndent": True,
                    }
                    if item.get("linkCode"):
                        new_row["linkCode"] = item["linkCode"]
                    structure.insert(insert_at, new_row)
                    insert_at += 1
                    added += 1

    return added, skipped


def _merge_income_statement(structure, rows):
    added = 0
    skipped = []
    rows_sorted = sorted(rows, key=lambda r: (r["categorie"], r["type"], r["classement"]))

    for row_data in rows_sorted:
        cat = row_data["categorie"]
        typ = row_data["type"]
        nom = row_data["nom"]
        link_code = row_data.get("linkCode")

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
                skipped.append({"nom": nom, "reason": "Section 'impôts' introuvable"})
                continue
        else:
            skipped.append({"nom": nom, "reason": f"Catégorie '{cat}' non reconnue"})
            continue

        parent_idx = _find_row_index(structure, parent_label)
        if parent_idx == -1:
            skipped.append({"nom": nom, "reason": f"Poste parent '{parent_label}' introuvable"})
            continue

        parent_row = structure[parent_idx]
        if "detailRows" not in parent_row:
            parent_row["detailRows"] = []

        existing = _get_existing_detail_labels(parent_row)
        if nom.lower() in existing:
            skipped.append({"nom": nom, "reason": f"Doublon ({parent_label})"})
            continue

        detail_row = {
            "label": nom,
            "indent": True,
        }
        if link_code:
            detail_row["linkCode"] = link_code
        parent_row["detailRows"].append(detail_row)
        parent_row["isExpanded"] = True
        added += 1

    return added, skipped


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
    verify_company_access(db, current_user, company_id)

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
        link_code = cells[4].strip() if len(cells) > 4 else ""
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
            "linkCode": link_code if link_code else None,
        })

    all_categories = BALANCE_SHEET_CATEGORIES | INCOME_STATEMENT_CATEGORIES
    balance_rows = []
    income_rows = []
    skipped_details = []

    for r in parsed_rows:
        if r["categorie"] in BALANCE_SHEET_CATEGORIES:
            balance_rows.append(r)
        elif r["categorie"] in INCOME_STATEMENT_CATEGORIES:
            income_rows.append(r)
        else:
            skipped_details.append({"nom": r["nom"], "reason": f"Catégorie '{r['categorie']}' non reconnue"})

    bs_structure = _get_or_default_structure(db, company_id, "balance-sheet")
    bs_added, bs_skipped = _merge_balance_sheet(bs_structure, balance_rows)
    skipped_details.extend(bs_skipped)

    is_structure = _get_or_default_structure(db, company_id, "income-statement")
    is_added, is_skipped = _merge_income_statement(is_structure, income_rows)
    skipped_details.extend(is_skipped)

    _save_structure(db, company_id, "balance-sheet", bs_structure)
    _save_structure(db, company_id, "income-statement", is_structure)
    db.commit()

    added = bs_added + is_added
    skipped = len(skipped_details)

    return {
        "income_statement_rows_added": is_added,
        "balance_sheet_rows_added": bs_added,
        "skipped": skipped,
        "skipped_details": skipped_details,
        "message": f"{added} rows imported ({bs_added} balance sheet, {is_added} income statement), {skipped} skipped",
    }
