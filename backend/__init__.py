from flask import Flask, send_from_directory

from .config import Config
from .extensions import db
from .routes.auth import auth_bp
from .routes.opportunities import opportunities_bp


def create_app():
    app = Flask(__name__, static_folder="../sky", static_url_path="")
    app.config.from_object(Config)

    db.init_app(app)

    with app.app_context():
        from . import models  # noqa: F401

        db.create_all()

    register_routes(app)
    return app


def register_routes(app):
    @app.get("/")
    def index():
        return send_from_directory(app.static_folder, "admin.html")

    @app.get("/health")
    def health():
        return {"status": "ok"}, 200

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(opportunities_bp, url_prefix="/api/opportunities")
