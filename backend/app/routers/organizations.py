import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.company import Company
from app.models.organization import Organization
from app.models.user import User, UserCompanyAccess, UserOrganization, UserRole
from app.schemas.organization import (
    MemberCompaniesUpdate,
    MemberInvite,
    MemberListResponse,
    MemberResponse,
    MemberRoleUpdate,
)
from app.utils.security import hash_password

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


def _granted_company_ids(db: Session, user_id: uuid.UUID, org_id: uuid.UUID) -> list[uuid.UUID]:
    """Company grants for a user, restricted to companies in this org."""
    rows = (
        db.query(UserCompanyAccess.company_id)
        .join(Company, Company.id == UserCompanyAccess.company_id)
        .filter(
            UserCompanyAccess.user_id == user_id,
            Company.organization_id == org_id,
        )
        .all()
    )
    return [r[0] for r in rows]


def _get_membership(db: Session, user: User, org_id: uuid.UUID) -> UserOrganization:
    """Verify user belongs to the organization."""
    membership = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == org_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )
    return membership


def _require_admin(db: Session, user: User, org_id: uuid.UUID) -> UserOrganization:
    """Verify user is an admin of the organization."""
    membership = _get_membership(db, user, org_id)
    if membership.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return membership


def _member_to_response(
    user: User, membership: UserOrganization, company_ids: list[uuid.UUID] | None = None
) -> MemberResponse:
    return MemberResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=membership.role.value,
        all_companies=membership.all_companies,
        company_ids=company_ids or [],
        created_at=membership.created_at,
    )


@router.get("/{org_id}/members", response_model=MemberListResponse)
def list_members(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all members of an organization."""
    _get_membership(db, current_user, org_id)

    memberships = (
        db.query(UserOrganization)
        .filter(UserOrganization.organization_id == org_id)
        .all()
    )

    members = []
    for m in memberships:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            grants = _granted_company_ids(db, user.id, org_id)
            members.append(_member_to_response(user, m, grants))

    return MemberListResponse(members=members)


@router.post(
    "/{org_id}/members",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def invite_member(
    org_id: uuid.UUID,
    body: MemberInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invite a user to the organization (admin only)."""
    _require_admin(db, current_user, org_id)

    # Validate role
    try:
        role = UserRole(body.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {body.role}. Must be admin, member, or viewer.",
        )

    # Check if org exists
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Find or create user
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        # Create user with temporary password
        user = User(
            email=body.email,
            hashed_password=hash_password("TemporaryPassword123!"),
            full_name=body.email.split("@")[0],
        )
        db.add(user)
        db.flush()

    # Check if already a member
    existing = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user.id,
            UserOrganization.organization_id == org_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this organization",
        )

    membership = UserOrganization(
        user_id=user.id,
        organization_id=org_id,
        role=role,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)

    return _member_to_response(user, membership)


@router.patch("/{org_id}/members/{user_id}", response_model=MemberResponse)
def update_member_role(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: MemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change a member's role and/or all-companies access (admin only)."""
    _require_admin(db, current_user, org_id)

    # Find the target membership
    membership = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if body.role is not None:
        try:
            new_role = UserRole(body.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {body.role}. Must be admin, member, or viewer.",
            )

        # Prevent demoting the last admin
        if membership.role == UserRole.ADMIN and new_role != UserRole.ADMIN:
            admin_count = (
                db.query(UserOrganization)
                .filter(
                    UserOrganization.organization_id == org_id,
                    UserOrganization.role == UserRole.ADMIN,
                )
                .count()
            )
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the last admin",
                )
        membership.role = new_role

    if body.all_companies is not None:
        membership.all_companies = body.all_companies

    db.commit()
    db.refresh(membership)

    user = db.query(User).filter(User.id == user_id).first()
    return _member_to_response(user, membership, _granted_company_ids(db, user_id, org_id))


@router.put("/{org_id}/members/{user_id}/companies", response_model=MemberResponse)
def set_member_companies(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    body: MemberCompaniesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace a member's per-company access grants (admin only).

    Only companies belonging to this org are accepted; the grant set for this
    org's companies is replaced wholesale with the provided list.
    """
    _require_admin(db, current_user, org_id)

    membership = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Validate that every requested company belongs to this org.
    requested = set(body.company_ids)
    if requested:
        valid = {
            r[0]
            for r in db.query(Company.id)
            .filter(Company.organization_id == org_id, Company.id.in_(requested))
            .all()
        }
        invalid = requested - valid
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more companies do not belong to this organization",
            )

    # Replace this user's grants for THIS org's companies only.
    org_company_ids = [
        r[0] for r in db.query(Company.id).filter(Company.organization_id == org_id).all()
    ]
    if org_company_ids:
        db.query(UserCompanyAccess).filter(
            UserCompanyAccess.user_id == user_id,
            UserCompanyAccess.company_id.in_(org_company_ids),
        ).delete(synchronize_session=False)
    for cid in requested:
        db.add(UserCompanyAccess(user_id=user_id, company_id=cid))
    db.commit()

    user = db.query(User).filter(User.id == user_id).first()
    db.refresh(membership)
    return _member_to_response(user, membership, _granted_company_ids(db, user_id, org_id))


@router.delete("/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from the organization (admin only)."""
    _require_admin(db, current_user, org_id)

    membership = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == user_id,
            UserOrganization.organization_id == org_id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Prevent removing the last admin
    if membership.role == UserRole.ADMIN:
        admin_count = (
            db.query(UserOrganization)
            .filter(
                UserOrganization.organization_id == org_id,
                UserOrganization.role == UserRole.ADMIN,
            )
            .count()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin",
            )

    db.delete(membership)
    db.commit()
