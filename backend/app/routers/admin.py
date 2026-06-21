"""Platform superadmin endpoints: manage clients (organizations) + feature flags.

All routes require a platform superadmin. A "client" is an Organization (tenant).
"""
import re
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_superadmin
from app.models.company import Company
from app.models.organization import Organization
from app.models.user import User, UserOrganization, UserRole
from app.schemas.admin import (
    AdminOrgListResponse,
    AdminOrgResponse,
    CreateClientRequest,
    FeatureFlagDef,
    FeatureFlagsUpdate,
)
from app.services import feature_flags as ff
from app.utils.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug or "client"


def _unique_slug(db: Session, name: str) -> str:
    base = _slugify(name)
    slug = base
    n = 1
    while db.query(Organization.id).filter(Organization.slug == slug).first() is not None:
        n += 1
        slug = f"{base}-{n}"
    return slug


def _org_to_response(db: Session, org: Organization) -> AdminOrgResponse:
    member_count = (
        db.query(func.count(UserOrganization.id))
        .filter(UserOrganization.organization_id == org.id)
        .scalar()
        or 0
    )
    company_count = (
        db.query(func.count(Company.id))
        .filter(Company.organization_id == org.id)
        .scalar()
        or 0
    )
    return AdminOrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        member_count=member_count,
        company_count=company_count,
        feature_flags=ff.effective_flags(org.feature_flags),
        created_at=org.created_at,
    )


@router.get("/feature-flags", response_model=list[FeatureFlagDef])
def list_feature_flag_registry(_: User = Depends(require_superadmin)):
    """The fixed registry of known feature flags (for rendering toggles)."""
    return [FeatureFlagDef(**f) for f in ff.FEATURE_FLAGS]


@router.get("/organizations", response_model=AdminOrgListResponse)
def list_clients(_: User = Depends(require_superadmin), db: Session = Depends(get_db)):
    """List every client (organization) with member/company counts + effective flags."""
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()
    return AdminOrgListResponse(organizations=[_org_to_response(db, o) for o in orgs])


@router.post("/organizations", response_model=AdminOrgResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: CreateClientRequest,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Create a client (organization) and assign a first admin user by email.

    If no user with that email exists, one is created with an unusable random
    password — they set it via the existing "forgot password" flow.
    """
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nom requis")

    org = Organization(name=name, slug=_unique_slug(db, name), feature_flags={})
    db.add(org)
    db.flush()

    user = db.query(User).filter(User.email == payload.admin_email).first()
    if user is None:
        user = User(
            email=payload.admin_email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            full_name=payload.admin_email.split("@")[0],
        )
        db.add(user)
        db.flush()

    existing = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == org.id,
        )
        .first()
    )
    if existing is None:
        db.add(UserOrganization(user_id=user.id, organization_id=org.id, role=UserRole.ADMIN))

    db.commit()
    db.refresh(org)
    return _org_to_response(db, org)


@router.patch("/organizations/{org_id}/feature-flags", response_model=AdminOrgResponse)
def set_feature_flags(
    org_id: uuid.UUID,
    payload: FeatureFlagsUpdate,
    _: User = Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    """Replace a client's feature-flag overrides (unknown keys are ignored)."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if org is None:
        raise HTTPException(status_code=404, detail="Client introuvable")

    org.feature_flags = ff.sanitize_overrides(payload.flags)
    db.commit()
    db.refresh(org)
    return _org_to_response(db, org)
