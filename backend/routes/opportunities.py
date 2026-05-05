from flask import Blueprint, jsonify, request, session

from ..extensions import db
from ..models import Admin, Opportunity
from ..services.opportunity_service import validate_opportunity_payload


opportunities_bp = Blueprint("opportunities", __name__)


@opportunities_bp.get("")
def list_opportunities():
    admin, error_response = require_admin()
    if error_response:
        return error_response

    opportunities = (
        db.session.execute(
            db.select(Opportunity)
            .where(Opportunity.admin_id == admin.id)
            .order_by(Opportunity.created_at.desc())
        )
        .scalars()
        .all()
    )
    return jsonify({"opportunities": [item.to_dict() for item in opportunities]}), 200


@opportunities_bp.post("")
def create_opportunity():
    admin, error_response = require_admin()
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    parsed, error_message = validate_opportunity_payload(data)
    if error_message:
        return jsonify({"message": error_message}), 400

    opportunity = Opportunity(admin_id=admin.id, **parsed)
    db.session.add(opportunity)
    db.session.commit()

    return jsonify({"message": "Opportunity created successfully", "opportunity": opportunity.to_dict()}), 201


@opportunities_bp.get("/<int:opportunity_id>")
def get_opportunity(opportunity_id):
    opportunity, error_response = get_owned_opportunity(opportunity_id)
    if error_response:
        return error_response
    return jsonify({"opportunity": opportunity.to_dict()}), 200


@opportunities_bp.put("/<int:opportunity_id>")
def update_opportunity(opportunity_id):
    opportunity, error_response = get_owned_opportunity(opportunity_id)
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    parsed, error_message = validate_opportunity_payload(data)
    if error_message:
        return jsonify({"message": error_message}), 400

    for key, value in parsed.items():
        setattr(opportunity, key, value)

    db.session.commit()
    return jsonify({"message": "Opportunity updated successfully", "opportunity": opportunity.to_dict()}), 200


@opportunities_bp.delete("/<int:opportunity_id>")
def delete_opportunity(opportunity_id):
    opportunity, error_response = get_owned_opportunity(opportunity_id)
    if error_response:
        return error_response

    db.session.delete(opportunity)
    db.session.commit()
    return jsonify({"message": "Opportunity deleted successfully"}), 200


def require_admin():
    admin_id = session.get("admin_id")
    if not admin_id:
        return None, (jsonify({"message": "Authentication required"}), 401)

    admin = db.session.get(Admin, admin_id)
    if not admin:
        return None, (jsonify({"message": "Authentication required"}), 401)

    return admin, None


def get_owned_opportunity(opportunity_id):
    admin, error_response = require_admin()
    if error_response:
        return None, error_response

    opportunity = db.session.get(Opportunity, opportunity_id)
    if not opportunity or opportunity.admin_id != admin.id:
        return None, (jsonify({"message": "Opportunity not found"}), 404)

    return opportunity, None
