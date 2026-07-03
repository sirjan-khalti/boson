"""
Create a SUPERADMIN user.

Usage (inside the app container):
    python scripts/create_superadmin.py --email admin@example.com --password secret --name "Admin"

The --name argument is optional and defaults to "Super Admin".
"""

import argparse
import sys
import os

# Allow imports from the app package when run from /app inside the container
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.exc import IntegrityError
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import Users
from app.schemas.user import Role


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a SUPERADMIN user")
    parser.add_argument("--email", required=True, help="Email address (used as username)")
    parser.add_argument("--password", required=True, help="Plain-text password")
    parser.add_argument("--name", default="Super Admin", help="Display name (default: 'Super Admin')")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        existing = db.query(Users).filter(Users.email == args.email).first()
        if existing:
            print(f"Error: a user with email '{args.email}' already exists (role: {existing.role}).")
            sys.exit(1)

        user = Users(
            name=args.name,
            email=args.email,
            hashed_password=get_password_hash(args.password),
            role=Role.SUPERADMIN,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Superadmin created — id: {user.id}  email: {user.email}")
    except IntegrityError:
        db.rollback()
        print(f"Error: email '{args.email}' is already taken.")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
