from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from ..extensions import db
from ..models import Admin


def build_reset_serializer(secret_key):
    return URLSafeTimedSerializer(secret_key, salt="reset-password")


def resolve_reset_token(secret_key, token):
    serializer = build_reset_serializer(secret_key)
    try:
        payload = serializer.loads(token, max_age=3600)
    except SignatureExpired:
        return None, "Reset link has expired"
    except BadSignature:
        return None, "Invalid reset link"

    admin = db.session.get(Admin, payload.get("admin_id"))
    if not admin:
        return None, "Invalid reset link"
    return admin, None
