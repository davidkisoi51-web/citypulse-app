"""Purchase creation and purchase history endpoints."""
from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from auth import require_user
from models import Tickets
from services.purchases import PurchaseValidationError, create_purchase
from services.roles import is_admin

purchases_bp = Blueprint("purchases", __name__)


@purchases_bp.post("")
@require_user
def add_purchase():
    try:
        ticket = create_purchase(request.get_json(silent=True), g.current_user.id)
    except PurchaseValidationError as exc:
        return jsonify(error={"code": exc.code, "message": str(exc)}), exc.status_code
    except SQLAlchemyError:
        current_app.logger.exception("Purchase could not be saved")
        return jsonify(error={
            "code": "purchase_save_failed",
            "message": "Your purchase could not be saved. Please try again.",
        }), 500
    return jsonify(data=ticket.purchase_dict()), 201


@purchases_bp.get("/mine")
@require_user
def list_my_purchases():
    purchases = (
        Tickets.query.filter_by(user_id=g.current_user.id)
        .order_by(Tickets.id.desc())
        .all()
    )
    return jsonify(data=[purchase.purchase_dict() for purchase in purchases]), 200


@purchases_bp.get("")
@require_user
def list_all_purchases():
    if not is_admin(g.current_user.email):
        return jsonify(error={
            "code": "forbidden",
            "message": "Admin access is required.",
        }), 403
    purchases = Tickets.query.order_by(Tickets.id.desc()).all()
    return jsonify(data=[purchase.purchase_dict() for purchase in purchases]), 200
