"""Environment-based configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv




load_dotenv(Path(__file__).with_name(".env"))

def database_url():
    url = os.getenv("DATABASE_URL", "sqlite:///citypulse_dev.db")#postgresql+psycopg://postgres:postgres@localhost:5432/citypulse_dev  
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://"): ]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"): ]
    return url

class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "local-only-change-me")
    SQLALCHEMY_DATABASE_URI = database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    CORS_ORIGINS = [origin.strip() for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if origin.strip()]
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("FLASK_SECRET_KEY")
    DEV_AUTH_STUB = os.getenv("DEV_AUTH_STUB", "false").lower() == "true"
    # Temporary development-only auth bridge. Disable outside local development.
    #DEV_AUTH_STUB = os.getenv("DEV_AUTH_STUB", "false").lower() == "true"
    DEV_AUTH_USER_ID = int(os.getenv("DEV_AUTH_USER_ID", "1"))
    TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY")
