"""QuickBooks Online OAuth + sync endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, verify_company_access
from app.integrations.quickbooks import oauth
from app.integrations.quickbooks import service as qbo_service
from app.integrations.quickbooks.client import QBOClientError
from app.models.company import Company
from app.models.company_link_code import CompanyLinkCode
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.standard_link_code import StandardLinkCode
from app.services.standard_link_code_utils import NET_INCOME_BALANCE_LINK_CODE
from app.models.user import User, UserOrganization
from app.schemas.quickbooks import (
    AuthorizeUrlResponse,
    ClassLocationTracking,
    ConnectionStatusResponse,
    LinkCodeOption,
    ObservedPair,
    TrialBalanceCommitRequest,
    TrialBalanceCommitResponse,
    TrialBalancePreviewRequest,
    TrialBalancePreviewResponse,
    TrialBalanceRowProposal,
)

router = APIRouter(prefix="/api/quickbooks", tags=["quickbooks"])


def _get_company_for_user(
    db: Session, user: User, company_id: uuid.UUID, *, require_write: bool = False
) -> Company:
    """Authorize QBO access via the central RBAC gate (read by default).

    QBO import is an edit operation, so commit/disconnect pass require_write=True
    (blocks viewers / users without an edit grant).
    """
    return verify_company_access(db, user, company_id, require_write=require_write)


def _require_active_connection(db: Session, company_id: uuid.UUID) -> QuickBooksConnection:
    conn = (
        db.query(QuickBooksConnection)
        .filter(QuickBooksConnection.company_id == company_id)
        .first()
    )
    if conn is None:
        raise HTTPException(status_code=404, detail="No QuickBooks connection for this company")
    if conn.status != "active":
        raise HTTPException(
            status_code=424,
            detail="QuickBooks connection is revoked — reconnect required",
        )
    return conn


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


@router.get("/authorize", response_model=AuthorizeUrlResponse)
def authorize(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    state = oauth.create_state(company.id, current_user.id)
    return AuthorizeUrlResponse(authorize_url=oauth.build_authorize_url(state))


@router.get("/callback")
def callback(
    state: str,
    code: str | None = None,
    realmId: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    try:
        payload = oauth.verify_state(state)
    except oauth.InvalidStateError:
        raise HTTPException(status_code=400, detail="Invalid or expired authorization state")

    if error:
        return RedirectResponse(
            f"{settings.frontend_url}/settings/companies/{payload.company_id}/quickbooks?qbo=denied",
            status_code=307,
        )

    if not code or not realmId:
        raise HTTPException(status_code=400, detail="Missing code or realmId")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=403, detail="User no longer active")

    company = _get_company_for_user(db, user, payload.company_id)

    try:
        tokens = oauth.exchange_code_for_tokens(code)
    except oauth.TokenExchangeError as e:
        raise HTTPException(status_code=502, detail=f"Token exchange with Intuit failed: {e}")

    qbo_service.upsert_connection(db, company.id, realmId, tokens, user.id)
    return RedirectResponse(
        f"{settings.frontend_url}/settings/companies/{company.id}/quickbooks?qbo=connected",
        status_code=307,
    )


@router.get(
    "/companies/{company_id}/connection",
    response_model=ConnectionStatusResponse,
)
def get_connection_status(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id)
    conn = (
        db.query(QuickBooksConnection)
        .filter(QuickBooksConnection.company_id == company.id)
        .first()
    )
    if conn is None:
        return ConnectionStatusResponse(status="not_connected")
    status_label = "connected" if conn.status == "active" else "revoked"
    return ConnectionStatusResponse(
        status=status_label,
        realm_id=conn.realm_id,
        connected_at=conn.connected_at,
        connected_by_user_id=str(conn.connected_by_user_id) if conn.connected_by_user_id else None,
    )


@router.delete("/companies/{company_id}/connection", status_code=204)
def disconnect_connection(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = _get_company_for_user(db, current_user, company_id, require_write=True)
    conn = (
        db.query(QuickBooksConnection)
        .filter(QuickBooksConnection.company_id == company.id)
        .first()
    )
    if conn is None:
        raise HTTPException(status_code=404, detail="No QuickBooks connection")
    qbo_service.disconnect(db, conn)
    return None


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
        observed_pairs=[ObservedPair(**p) for p in result.get("observed_pairs", [])],
        class_location_tracking=ClassLocationTracking(
            **result.get("class_location_tracking", {})
        ),
    )


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
    company = _get_company_for_user(db, current_user, company_id, require_write=True)
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


@router.get(
    "/companies/{company_id}/link-codes",
    response_model=list[LinkCodeOption],
)
def list_link_codes(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all assignable (leaf) link codes for the QBO review picker.

    Returns the global standardized codes (shared chart) unioned with this
    company's tenant-local custom codes (company_link_codes), so a complex
    client's private codes are also assignable during a QBO import.
    """
    _get_company_for_user(db, current_user, company_id)

    _BALANCE_SHEET_FAMILIES = {"ACT", "ALT", "PCT", "PLT", "CAP"}

    def _statement_type(family: str) -> str:
        return (
            "income_statement"
            if family not in _BALANCE_SHEET_FAMILIES
            else "balance_sheet"
        )

    codes = (
        db.query(StandardLinkCode)
        .filter(
            StandardLinkCode.is_leaf.is_(True),
            StandardLinkCode.code != NET_INCOME_BALANCE_LINK_CODE,
        )
        .order_by(StandardLinkCode.sort_order)
        .all()
    )

    options = [
        LinkCodeOption(
            code=c.code,
            label=c.label_sub_account or c.label_account or c.code,
            statement_type=_statement_type(c.family),
            parent_id=c.parent_code,
            parent_label=c.label_account,
        )
        for c in codes
    ]

    custom_codes = (
        db.query(CompanyLinkCode)
        .filter(
            CompanyLinkCode.company_id == company_id,
            CompanyLinkCode.is_leaf.is_(True),
        )
        .order_by(CompanyLinkCode.family, CompanyLinkCode.sort_order)
        .all()
    )

    options.extend(
        LinkCodeOption(
            code=c.code,
            label=c.label_sub_account or c.label_account or c.code,
            statement_type=_statement_type(c.family),
            parent_id=c.parent_code,
            parent_label=c.label_account,
        )
        for c in custom_codes
    )

    return options


