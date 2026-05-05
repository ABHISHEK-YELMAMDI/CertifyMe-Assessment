from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from ..models import Admin


def normalize_email(email):
    return (email or "").strip().lower()


def validate_signup_payload(full_name, email, password, confirm_password):
    if not full_name:
        return "Full name is required"
    if not email or "@" not in email:
        return "A valid email is required"
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if password != confirm_password:
        return "Passwords do not match"
    return None


def get_admin_by_email(email):
    normalized_email = normalize_email(email)
    return db.session.execute(
        db.select(Admin).where(func.lower(Admin.email) == normalized_email)
    ).scalar_one_or_none()


def create_admin(full_name, email, password):
    admin = Admin(
        full_name=full_name.strip(),
        email=normalize_email(email),
        password_hash=generate_password_hash(password),
    )
    db.session.add(admin)
    db.session.commit()
    return admin


def verify_admin_credentials(email, password):
    admin = get_admin_by_email(email)
    if not admin or not check_password_hash(admin.password_hash, password):
        return None
    return admin


def update_admin_password(admin, password):
    admin.password_hash = generate_password_hash(password)
    db.session.commit()
