"""Propage la charte de comptes aux structures d'états des sociétés existantes.

Les structures sont un instantané pris à la création de la société. Une société
créée avant la charte standardisée garde donc des structures sans aucun code de
liaison : aucun de ses états ne calcule, quel que soit le mapping comptable. C'est
la troisième étape, après les deux seeds :

    python -m app.scripts.seed_standard_link_codes    # MO.xlsx → charte
    python -m app.scripts.seed_cash_flow_link_codes   # colonnes FT → TEX/TIN/TFI
    python -m app.scripts.sync_statement_structures   # charte → sociétés

Par défaut, seules les sociétés dont **aucune** structure ne référence de code sont
régénérées : là il n'y a rien à perdre. Une structure personnalisée n'est jamais
écrasée sans ``--force``, parce que la régénération repart de zéro.

    --dry-run   montre ce qui serait fait
    --force     régénère aussi les structures déjà câblées (écrase les ajustements)
"""
from __future__ import annotations

import os
import sys

STATEMENT_TYPES = ("income-statement", "balance-sheet", "cash-flow", "cash-flow-detail")


def structure_has_link_codes(rows) -> bool:
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        if str(row.get("linkCode") or "").strip():
            return True
        for key in ("liaisonSumCodes", "liaisonNumeratorCodes", "liaisonDenominatorCodes"):
            values = row.get(key)
            if isinstance(values, list) and any(str(v or "").strip() for v in values):
                return True
        if structure_has_link_codes(row.get("children") or row.get("detailRows")):
            return True
    return False


def company_is_wired(session, company_id) -> bool:
    """True dès qu'une structure d'état référence un code de liaison."""
    from app.models.financial_statement_mapping import CompanyStatementStructure

    rows = (
        session.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type.in_(STATEMENT_TYPES),
        )
        .all()
    )
    return any(structure_has_link_codes(s.structure) for s in rows)


def sync(db_url: str | None = None, dry_run: bool = False, force: bool = False) -> int:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.models.company import Company
    from app.services.statement_template import sync_company_structures_from_standard

    if db_url is None:
        try:
            from app.config import settings
            db_url = settings.database_url
        except Exception:
            db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            print("ERROR: DATABASE_URL not set")
            return 1

    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("+asyncpg", "")
    engine = create_engine(sync_url)

    with Session(engine) as session:
        companies = session.query(Company).order_by(Company.name).all()
        if not companies:
            print("Aucune société.")
            return 0

        a_traiter, deja_cablees = [], []
        for company in companies:
            if force or not company_is_wired(session, company.id):
                a_traiter.append(company)
            else:
                deja_cablees.append(company)

        # Sortie en ASCII : la console Windows (cp1252) ne sait pas encoder les
        # flèches, et un script d'exploitation ne doit pas planter sur son affichage.
        for company in deja_cablees:
            print(f"  [intacte] {company.name} - deja cablee")
        for company in a_traiter:
            print(f"  [regen]   {company.name} - structures regenerees depuis la charte")

        if dry_run:
            print(f"\n--dry-run : {len(a_traiter)} société(s) seraient régénérée(s).")
            return 0

        for company in a_traiter:
            sync_company_structures_from_standard(session, company.id)
        session.commit()

        print(f"\n{len(a_traiter)} société(s) régénérée(s), {len(deja_cablees)} intacte(s).")
        if deja_cablees and not force:
            print("Utilisez --force pour régénérer aussi les structures déjà câblées "
                  "(cela écrase les ajustements manuels).")
    return 0


if __name__ == "__main__":
    sys.exit(sync(dry_run="--dry-run" in sys.argv, force="--force" in sys.argv))
