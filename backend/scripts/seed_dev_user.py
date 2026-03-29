"""
Crée (ou met à jour le mot de passe de) un utilisateur de développement + organisation.

Base dans Docker (depuis la racine du dépôt, avec un fichier .env chargé par docker compose) :

  docker compose run --rm backend python scripts/seed_dev_user.py

  docker compose exec backend python scripts/seed_dev_user.py   # si le service backend tourne déjà

Arguments optionnels : --email, --password, --full-name, --organization
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Charge tous les modèles (Company → Customer, Supplier)
import app.models  # noqa: F401

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.organization import Organization
from app.models.user import User, UserOrganization, UserRole
from app.utils.security import hash_password


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug or "org"


def seed_user(
    db: Session,
    *,
    email: str,
    password: str,
    full_name: str,
    organization_name: str,
) -> None:
    email_norm = email.strip().lower()

    user = db.query(User).filter(User.email == email_norm).first()
    if user:
        user.hashed_password = hash_password(password)
        user.full_name = full_name
        user.is_active = True
        db.commit()
        print(f"Utilisateur existant mis à jour : {email_norm}")
        return

    slug = _slugify(organization_name)
    base_slug = slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=organization_name, slug=slug)
    db.add(org)
    db.flush()

    user = User(
        email=email_norm,
        hashed_password=hash_password(password),
        full_name=full_name,
    )
    db.add(user)
    db.flush()

    db.add(
        UserOrganization(
            user_id=user.id,
            organization_id=org.id,
            role=UserRole.ADMIN,
        )
    )
    db.commit()
    print(f"Utilisateur créé : {email_norm} (organisation « {organization_name} »)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compte dev Modelisys (PostgreSQL).")
    parser.add_argument("--email", default="Tristanbellerose1@gmail.com")
    parser.add_argument("--password", default="Modelisys123")
    parser.add_argument("--full-name", default="Tristan Bellerose")
    parser.add_argument("--organization", default="Modelisys")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        seed_user(
            db,
            email=args.email,
            password=args.password,
            full_name=args.full_name,
            organization_name=args.organization,
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
