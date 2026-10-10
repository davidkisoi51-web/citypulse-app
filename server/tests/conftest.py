import pytest
from app import create_app
from extensions import db


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-only-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = ["http://localhost:5173"]
    DEV_AUTH_STUB = True
    DEV_AUTH_USER_ID = 1


@pytest.fixture()
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        from models import User, Plan
        user = User(id=1, name="Test User", email="test@example.test", password_hash="not-used")
        db.session.add(user)
        db.session.add(Plan(user_id=1, title="Want to go"))
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
