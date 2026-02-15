import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.organization import Organization
from app.models.user import User, UserOrganization, UserRole
from app.schemas.organization import (
    MemberInvite,
    MemberListResponse,
    MemberResponse,
    MemberRoleUpdate,
)
from app.utils.security import hash_password

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


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


def _member_to_response(user: User, membership: UserOrganization) -> MemberResponse:
    return MemberResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=membership.role.value,
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
            members.append(_member_to_response(user, m))

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
    """Change a member's role (admin only)."""
    _require_admin(db, current_user, org_id)

    # Validate role
    try:
        new_role = UserRole(body.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {body.role}. Must be admin, member, or viewer.",
        )

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
    db.commit()
    db.refresh(membership)

    user = db.query(User).filter(User.id == user_id).first()
    return _member_to_response(user, membership)


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
