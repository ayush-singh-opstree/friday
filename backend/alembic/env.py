"""
alembic/env.py — Alembic migration environment.

Reads DATABASE_URL from the app's config module (which in turn reads .env)
so migrations always use the same connection string as the running app.

To generate a migration:
    alembic revision --autogenerate -m "describe_change"

To apply all pending migrations:
    alembic upgrade head
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Make sure the project root is on sys.path so we can import `app`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import app config + all models so Alembic sees the metadata
from app.config import DATABASE_URL  # noqa: E402
from app.db import Base             # noqa: E402
import app.models                   # noqa: E402, F401  — registers all ORM classes


# ── Alembic Config ────────────────────────────────────────────────────────────
config = context.config

# Override the sqlalchemy.url with our real DATABASE_URL from .env
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ── Migration helpers ─────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations without a DB connection (emit SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations with an active DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

