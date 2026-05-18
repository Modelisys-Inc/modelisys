import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.company import Company
from app.models.user import User, UserOrganization
from app.utils.security import decode_token

security = HTTPBearer()


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


def verify_company_access(db: Session, user: User, company_id: uuid.UUID) -> Company:
    company = (
        db.query(Company)
        .join(
            UserOrganization,
            UserOrganization.organization_id == Company.organization_id,
        )
        .filter(
            Company.id == company_id,
            UserOrganization.user_id == user.id,
        )
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
