"""Create a user in the database. Run from backend/ directory:
    python -m app.scripts.create_user
"""

import os
import sys
import uuid


def main() -> None:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    try:
        from app.config import settings
        db_url = settings.database_url
    except Exception:
        db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("+asyncpg", "")
    engine = create_engine(sync_url)

    email = "alexandre@modelisys.com"
    password = "Test1234!"
    full_name = "Alexandre Moreau"

    from app.models.user import User
    from app.utils.security import hash_password

    with Session(engine) as session:
        existing = session.query(User).filter(User.email == email).first()
        if existing:
            print(f"User {email} already exists (id={existing.id})")
            return

        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            is_active=True,
        )
        session.add(user)
        session.commit()
        print(f"Created user {email} (id={user.id})")


if __name__ == "__main__":
    main()
