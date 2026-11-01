"""
db.py — SQLAlchemy engine, session factory, Base, and get_db() dependency.

Pattern mirrors the reference REMS project:
  - Synchronous engine with psycopg2
  - Connection pool tuned for a small Hackathon service
  - Base imported here so Alembic env.py has one clean import target
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator

from app.config import DATABASE_URL, DEBUG

# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_engine(
    DATABASE_URL,
    echo=DEBUG,           # log SQL in development
    pool_pre_ping=True,   # recycle stale connections
    pool_size=5,
    max_overflow=10,
)

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ── Declarative base ──────────────────────────────────────────────────────────
# All ORM models inherit from Base.  Alembic imports Base.metadata for
# autogenerate migrations.
Base = declarative_base()


# ── FastAPI dependency ────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """Yield a DB session and guarantee it is closed after the request."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

