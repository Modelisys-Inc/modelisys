import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.models.user import User
from app.schemas.company_diagnostic import CompanyDiagnosticResponse
from app.services.company_diagnostic import compute_company_diagnostic

router = APIRouter(
    prefix="/api/companies/{company_id}/diagnostic",
    tags=["diagnostic"],
)


@router.get("", response_model=CompanyDiagnosticResponse)
def get_company_diagnostic(
    company_id: uuid.UUID,
    fiscal_year: int | None = Query(default=None, ge=1900, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompanyDiagnosticResponse:
    """Diagnostic complet de l'entreprise (lecture seule).

    Accès : tout utilisateur pouvant LIRE l'entreprise (y compris viewer) ;
    404 si l'entreprise n'existe pas ou n'est pas accessible.

    `fiscal_year` et `month` (calendaires, comme les états financiers) ancrent
    le rapport à une date de référence. Sans ces paramètres, la dernière période
    de balance de vérification disponible est utilisée.
    """
    if (fiscal_year is None) ^ (month is None):
        raise HTTPException(
            status_code=422,
            detail="fiscal_year et month doivent être fournis ensemble",
        )
    company = verify_company_access(db, current_user, company_id)
    return compute_company_diagnostic(
        db,
        company,
        reference_calendar_year=fiscal_year,
        reference_calendar_month=month,
    )
