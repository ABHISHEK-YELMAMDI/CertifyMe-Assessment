import os
from datetime import timedelta

from dotenv import load_dotenv


load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)

    if not SQLALCHEMY_DATABASE_URI:
        raise RuntimeError("DATABASE_URL is not configured. Set it in your environment or .env file.")
