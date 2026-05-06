"""QuickBooks Online OAuth + sync endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.integrations.quickbooks import oauth, service
from app.integrations.quickbooks import service as qbo_service
from app.integrations.quickbooks.client import QBOClientError
from app.models.company import Company
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.user import User, UserOrganization
from app.schemas.quickbooks import (
    AuthorizeUrlResponse,
    ConnectionStatusResponse,
    LinkCodeCreateRequest,
    LinkCodeOption,
    TrialBalanceCommitRequest,
    TrialBalanceCommitResponse,
    TrialBalancePreviewRequest,
    TrialBalancePreviewResponse,
    TrialBalanceRowProposal,
)

router = APIRouter(prefix="/api/quickbooks", tags=["quickbooks"])


def _get_company_for_user(db: Session, user: User, company_id: uuid.UUID) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    membership = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == company.organization_id,
        )
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=403, detail="Not authorized for this company")
    return company


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

    service.upsert_connection(db, company.id, realmId, tokens, user.id)
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
    company = _get_company_for_user(db, current_user, company_id)
    conn = (
        db.query(QuickBooksConnection)
        .filter(QuickBooksConnection.company_id == company.id)
        .first()
    )
    if conn is None:
        raise HTTPException(status_code=404, detail="No QuickBooks connection")
    service.disconnect(db, conn)
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
    if not 1 <= body.month <= 12:
        raise HTTPException(status_code=422, detail="month must be between 1 and 12")
    try:
        result = qbo_service.propose_trial_balance(db, conn, company, body.fiscal_year, body.month)
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
        month=body.month,
        currency=result["currency"],
        fetched_at=datetime.now(timezone.utc),
        rows=[TrialBalanceRowProposal(**r) for r in result["rows"]],
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
    company = _get_company_for_user(db, current_user, company_id)
    if not 1 <= body.month <= 12:
        raise HTTPException(status_code=422, detail="month must be between 1 and 12")
    try:
        result = qbo_service.commit_trial_balance(
            db, company, body.fiscal_year, body.month,
            [r.model_dump() for r in body.rows], body.overwrite_existing_tb,
        )
    except qbo_service.TBConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
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
    company = _get_company_for_user(db, current_user, company_id)
    structures = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company.id)
        .order_by(CompanyStatementStructure.statement_type)
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
