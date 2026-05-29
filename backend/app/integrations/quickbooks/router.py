"""QuickBooks Online OAuth + sync endpoints."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.integrations.quickbooks import oauth
from app.integrations.quickbooks import service as qbo_service
from app.routers.statement_structures import VALID_STATEMENT_TYPES
from app.integrations.quickbooks.client import QBOClientError
from app.models.company import Company
from app.models.financial_statement_mapping import CompanyStatementStructure
from app.models.quickbooks_connection import QuickBooksConnection
from app.models.user import User, UserOrganization
from app.schemas.quickbooks import (
    AuthorizeUrlResponse,
    ClassLocationTracking,
    ConnectionStatusResponse,
    LinkCodeCreateRequest,
    LinkCodeOption,
    ObservedPair,
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
    company = _get_company_for_user(db, current_user, company_id)
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
            next_parent_id = node.get("id") or node.get("label")
            next_parent_label = node.get("label")
            for key in ("children", "detailRows"):
                children = node.get(key)
                if isinstance(children, list):
                    for child in children:
                        walk(child, statement_type, next_parent_id, next_parent_label)
        elif isinstance(node, list):
            for item in node:
                walk(item, statement_type, parent_id, parent_label)

    for s in structures:
        walk(s.structure, s.statement_type, None, None)
    return options


def _node_matches(node: dict, target: str) -> bool:
    return node.get("id") == target or node.get("label") == target


def _find_insertion_point(structure, target: str):
    """Find where to insert a new leaf identified by id-or-label.

    Returns (target_list, insert_index, parent_label) or None if not found.

    Three real-world structure shapes are supported:
    - Tree via `children`: append at the end of `parent.children`.
    - Tree via `detailRows`: append at the end of `parent.detailRows`.
    - Flat (sections and leaves are siblings): insert into the parent array
      right before the next section header (or at the end of the array).
    """
    def walk(arr):
        if not isinstance(arr, list):
            return None
        for i, n in enumerate(arr):
            if not isinstance(n, dict):
                continue
            if _node_matches(n, target):
                if isinstance(n.get("detailRows"), list):
                    return (n["detailRows"], len(n["detailRows"]), n.get("label"))
                if isinstance(n.get("children"), list):
                    return (n["children"], len(n["children"]), n.get("label"))
                # Flat: parent is a marker; insert siblings after it, before
                # the next section header.
                next_idx = i + 1
                while next_idx < len(arr):
                    sib = arr[next_idx]
                    if isinstance(sib, dict) and (
                        sib.get("isSection") or sib.get("isBold")
                    ):
                        break
                    next_idx += 1
                return (arr, next_idx, n.get("label"))
            for key in ("children", "detailRows"):
                sub = n.get(key)
                if isinstance(sub, list):
                    found = walk(sub)
                    if found is not None:
                        return found
        return None

    return walk(structure)


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
            for key in ("children", "detailRows"):
                walk(node.get(key))

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

    link_code = body.link_code.strip()
    label = body.label.strip()
    if not link_code:
        raise HTTPException(status_code=422, detail="link_code must not be empty")
    if not label:
        raise HTTPException(status_code=422, detail="label must not be empty")

    target = (
        db.query(CompanyStatementStructure)
        .filter(
            CompanyStatementStructure.company_id == company.id,
            CompanyStatementStructure.statement_type == body.statement_type,
        )
        .with_for_update()
        .first()
    )
    if target is None:
        raise HTTPException(
            status_code=422,
            detail=f"No {body.statement_type} structure exists for this company",
        )

    all_structures = (
        db.query(CompanyStatementStructure)
        .filter(CompanyStatementStructure.company_id == company.id)
        .all()
    )
    for s in all_structures:
        if link_code in _collect_all_codes(s.structure):
            raise HTTPException(
                status_code=422,
                detail=f"link_code {link_code} already exists for this company",
            )

    insertion = _find_insertion_point(target.structure, body.parent_id)
    if insertion is None:
        raise HTTPException(
            status_code=422,
            detail=f"Parent node {body.parent_id} not found in structure",
        )
    target_list, insert_index, parent_label = insertion

    # Match the visual style most production leaves use (indent under section).
    new_leaf = {"label": label, "linkCode": link_code, "indent": True}
    target_list.insert(insert_index, new_leaf)

    flag_modified(target, "structure")
    db.commit()

    return LinkCodeOption(
        code=link_code,
        label=label,
        statement_type=body.statement_type,
        parent_id=body.parent_id,
        parent_label=parent_label,
    )
