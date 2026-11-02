"""
config.py — Application configuration loaded from environment variables.

All settings are module-level constants so they can be imported anywhere
without instantiation overhead.  python-dotenv loads the .env file once
at module import time.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────────────────────────
DB_HOST: str = os.getenv("DB_HOST", "localhost")
DB_PORT: str = os.getenv("DB_PORT", "5432")
DB_NAME: str = os.getenv("DB_NAME", "threadwise")
DB_USER: str = os.getenv("DB_USER", "postgres")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")

# Full URL; can be overridden directly in .env
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
)

# ── App ───────────────────────────────────────────────────────────────────────
APP_ENV: str = os.getenv("APP_ENV", "development")
APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

# ── CORS ─────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
CORS_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── Demo / MVP ────────────────────────────────────────────────────────────────
# Phase 0 is a single-user hackathon build — no auth required.
DEMO_USER_ID: str = os.getenv("DEMO_USER_ID", "00000000-0000-0000-0000-000000000001")
DEMO_USER_EMAIL: str = os.getenv("DEMO_USER_EMAIL", "meera@threadwise.app")
DEMO_USER_NAME: str = os.getenv("DEMO_USER_NAME", "Meera Krishnamurthy")

# ── Going-cold defaults ───────────────────────────────────────────────────────
DEFAULT_GOING_COLD_THRESHOLD_DAYS: int = int(
    os.getenv("DEFAULT_GOING_COLD_THRESHOLD_DAYS", "14")
)
DEFAULT_DIGEST_TIME: str = os.getenv("DEFAULT_DIGEST_TIME", "08:00")

# ── AI (Gemini) ─────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

