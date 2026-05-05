from flask import Blueprint, current_app, jsonify, request, session

from ..services.auth_service import (
    create_admin,
    get_admin_by_email,
    normalize_email,
    update_admin_password,
    validate_signup_payload,
    verify_admin_credentials,
)
from ..utils.tokens import build_reset_serializer, resolve_reset_token


auth_bp = Blueprint("auth", __name__)


@auth_bp.get("/session")
def get_session_state():
    admin = current_admin()
    if not admin:
        return jsonify({"authenticated": False}), 200
    return jsonify({"authenticated": True, "admin": admin.to_session_payload()}), 200


@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email = normalize_email(data.get("email"))
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    validation_error = validate_signup_payload(full_name, email, password, confirm_password)
    if validation_error:
        return jsonify({"message": validation_error}), 400

    if get_admin_by_email(email):
        return jsonify({"message": "Email already exists"}), 409

    create_admin(full_name, email, password)
    return jsonify({"message": "Account created successfully"}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password") or ""
    remember_me = bool(data.get("remember_me"))

    admin = verify_admin_credentials(email, password)
    if not admin:
        return jsonify({"message": "Invalid email or password"}), 401

    session.clear()
    session["admin_id"] = admin.id
    session.permanent = remember_me

    return jsonify({"message": "Login successful", "admin": admin.to_session_payload()}), 200


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Signed out successfully"}), 200


@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = normalize_email(data.get("email"))
    admin = get_admin_by_email(email)

    if admin:
        token = build_reset_serializer(current_app.config["SECRET_KEY"]).dumps({"admin_id": admin.id})
        reset_link = f"{request.host_url.rstrip('/')}/api/auth/reset-password/{token}"
        current_app.logger.info("Generated reset link for %s: %s", admin.email, reset_link)

    return jsonify({"message": "If the email is registered, a reset link has been generated."}), 200


@auth_bp.get("/reset-password/<token>")
def validate_reset_token(token):
    admin, error_message = resolve_reset_token(current_app.config["SECRET_KEY"], token)
    if error_message:
        return jsonify({"message": error_message}), 400

    return jsonify({"message": "Reset token is valid", "admin": admin.to_session_payload()}), 200


@auth_bp.post("/reset-password/<token>")
def reset_password(token):
    admin, error_message = resolve_reset_token(current_app.config["SECRET_KEY"], token)
    if error_message:
        return jsonify({"message": error_message}), 400

    data = request.get_json(silent=True) or {}
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400
    if password != confirm_password:
        return jsonify({"message": "Passwords do not match"}), 400

    update_admin_password(admin, password)
    return jsonify({"message": "Password reset successfully"}), 200


def current_admin():
    from ..extensions import db
    from ..models import Admin

    admin_id = session.get("admin_id")
    if not admin_id:
        return None
    return db.session.get(Admin, admin_id)
