import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.company import Company
from app.models.user import User, UserCompanyAccess, UserOrganization, UserRole
from app.utils.security import decode_token

security = HTTPBearer()

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


def get_membership(db: Session, user: User, organization_id: uuid.UUID) -> UserOrganization | None:
    return (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == organization_id,
        )
        .first()
    )


def user_can_access_company(db: Session, user: User, company: Company) -> bool:
    """True if the user may at least READ this company (ignores edit/view)."""
    if user.is_superadmin:
        return True
    membership = get_membership(db, user, company.organization_id)
    if membership is None:
        return False
    if membership.role == UserRole.ADMIN or membership.all_companies:
        return True
    return (
        db.query(UserCompanyAccess)
        .filter(
            UserCompanyAccess.user_id == user.id,
            UserCompanyAccess.company_id == company.id,
        )
        .first()
        is not None
    )


def verify_company_access(
    db: Session, user: User, company_id: uuid.UUID, *, require_write: bool = False
) -> Company:
    """Authorize access to a company.

    Read access (require_write=False): superadmin, org admin, or a member/viewer
    granted the company (or with all_companies). Missing access → 404 (don't leak
    existence). Write access (require_write=True): same, but viewers are rejected
    with 403 (read-only).
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    if user.is_superadmin:
        return company

    membership = get_membership(db, user, company.organization_id)
    if membership is None:
        raise HTTPException(status_code=404, detail="Company not found")

    if membership.role == UserRole.ADMIN:
        return company

    # member / viewer: must have access to this specific company.
    granted = membership.all_companies or (
        db.query(UserCompanyAccess)
        .filter(
            UserCompanyAccess.user_id == user.id,
            UserCompanyAccess.company_id == company_id,
        )
        .first()
        is not None
    )
    if not granted:
        raise HTTPException(status_code=404, detail="Company not found")

    if require_write and membership.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Lecture seule : modification non autorisée")

    return company


def verify_company_write_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    return verify_company_access(db, user, company_id, require_write=True)


def enforce_company_write(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Router-level guard: on any non-safe HTTP method against a path that carries
    a {company_id}, require write access (blocks viewers / ungranted users).

    Attached to company-scoped routers in main.py so every current and future
    mutation is covered without per-endpoint changes. Paths without a company_id
    (e.g. nested /divisions/{id}) are not gated here — those keep their own checks.
    """
    if request.method in _SAFE_METHODS:
        return
    raw = request.path_params.get("company_id")
    if not raw:
        return
    try:
        company_id = uuid.UUID(str(raw))
    except (ValueError, TypeError):
        return
    verify_company_access(db, current_user, company_id, require_write=True)


def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that allows only platform superadmins."""
    if not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="Réservé aux super-administrateurs")
    return current_user


def require_org_admin(db: Session, user: User, organization_id: uuid.UUID) -> None:
    """Raise unless the user is a superadmin or an admin of the given org."""
    if user.is_superadmin:
        return
    membership = get_membership(db, user, organization_id)
    if membership is None or membership.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs de l'organisation")
