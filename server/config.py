"""Environment-based configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "local-only-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/citypulse_dev"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    CORS_ORIGINS = [origin.strip() for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if origin.strip()]
    # Temporary development-only auth bridge. Disable outside local development.
    DEV_AUTH_STUB = os.getenv("DEV_AUTH_STUB", "false").lower() == "true"
    DEV_AUTH_USER_ID = int(os.getenv("DEV_AUTH_USER_ID", "1"))
