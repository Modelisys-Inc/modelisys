"""Grant or revoke platform superadmin for a user, by email.

Superadmin is platform-staff only and is intentionally NOT settable through the
app UI/API — it's granted out-of-band with this script.

Usage (from backend/):
    python -m app.scripts.set_superadmin user@example.com
    python -m app.scripts.set_superadmin user@example.com --revoke
"""

import os
import sys


def _resolve_db_url() -> str:
    try:
        from app.config import settings
        db_url = settings.database_url
    except Exception:
        db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    # async driver → sync for this one-off script
    return db_url.replace("postgresql+asyncpg://", "postgresql://").replace("+asyncpg", "")


def main() -> None:
    args = sys.argv[1:]
    revoke = "--revoke" in args
    emails = [a for a in args if not a.startswith("-")]
    if not emails:
        print(__doc__)
        sys.exit(1)
    email = emails[0]

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.models.user import User

    engine = create_engine(_resolve_db_url())
    with Session(engine) as session:
        user = session.query(User).filter(User.email == email).first()
        if user is None:
            print(f"ERROR: no user with email {email!r}")
            sys.exit(1)
        user.is_superadmin = not revoke
        session.commit()
        state = "revoked from" if revoke else "granted to"
        print(f"Superadmin {state} {email} (is_superadmin={user.is_superadmin})")


if __name__ == "__main__":
    main()
