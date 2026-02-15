import re
import uuid

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.organization import Organization
from app.models.user import User, UserOrganization, UserRole
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    OrganizationResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.utils.logging import get_logger
from app.utils.rate_limit import auth_rate_limiter
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = get_logger(__name__)

# Cookie settings for refresh token
REFRESH_TOKEN_COOKIE = "refresh_token"
REFRESH_TOKEN_MAX_AGE = settings.refresh_token_expire_days * 24 * 60 * 60  # seconds


def _set_refresh_cookie(response: Response, refresh_token: str):
    """Set httpOnly cookie for refresh token."""
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        max_age=REFRESH_TOKEN_MAX_AGE,
        httponly=True,
        secure=settings.environment == "production",  # HTTPS only in production
        samesite="lax",
        path="/api/auth",  # Only sent to auth endpoints
    )


def _clear_refresh_cookie(response: Response):
    """Clear the refresh token cookie."""
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path="/api/auth",
    )


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    http_request: Request,
    request: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    # Rate limiting
    auth_rate_limiter.check(http_request)

    # Check if email already exists
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create organization
    slug = _slugify(request.organization_name)
    # Ensure slug uniqueness
    base_slug = slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=request.organization_name, slug=slug)
    db.add(org)
    db.flush()

    # Create user
    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
    )
    db.add(user)
    db.flush()

    # Create membership (admin of the new org)
    membership = UserOrganization(
        user_id=user.id,
        organization_id=org.id,
        role=UserRole.ADMIN,
    )
    db.add(membership)
    db.commit()

    # Generate tokens
    token_data = {"sub": str(user.id)}
    refresh_token = create_refresh_token(token_data)

    # Set httpOnly cookie for refresh token
    _set_refresh_cookie(response, refresh_token)

    logger.info(f"New user registered: {request.email}, org: {request.organization_name}")

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=refresh_token,  # Also return in body for backward compatibility
    )


@router.post("/login", response_model=TokenResponse)
def login(
    http_request: Request,
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    # Rate limiting
    auth_rate_limiter.check(http_request)

    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        logger.warning(f"Failed login attempt for email: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    token_data = {"sub": str(user.id)}
    refresh_token = create_refresh_token(token_data)

    # Set httpOnly cookie for refresh token
    _set_refresh_cookie(response, refresh_token)

    logger.info(f"User logged in: {request.email}")

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=refresh_token,  # Also return in body for backward compatibility
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    request: RefreshRequest | None = None,
    refresh_token_cookie: str | None = Cookie(default=None, alias=REFRESH_TOKEN_COOKIE),
    db: Session = Depends(get_db),
):
    # Try cookie first, then fall back to request body
    token = refresh_token_cookie
    if not token and request:
        token = request.refresh_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
        )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    token_data = {"sub": str(user.id)}
    new_refresh_token = create_refresh_token(token_data)

    # Update httpOnly cookie
    _set_refresh_cookie(response, new_refresh_token)

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=new_refresh_token,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    """Clear refresh token cookie."""
    _clear_refresh_cookie(response)
    return None


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memberships = (
        db.query(UserOrganization)
        .filter(UserOrganization.user_id == current_user.id)
        .all()
    )

    organizations = []
    for m in memberships:
        org = db.query(Organization).filter(Organization.id == m.organization_id).first()
        if org:
            organizations.append(
                OrganizationResponse(
                    id=org.id,
                    name=org.name,
                    slug=org.slug,
                    role=m.role.value,
                )
            )

    return MeResponse(
        user=UserResponse.model_validate(current_user),
        organizations=organizations,
    )
