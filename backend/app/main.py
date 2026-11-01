"""
main.py — FastAPI application entry point for Threadwise backend.

Startup sequence:
  1. Load config (via config.py / dotenv)
  2. Lifespan: verify DB connectivity
  3. Register CORS middleware
  4. Mount all routers from app/routers/__init__.py
  5. Health-check endpoint

Phase 0 note: No auth middleware — single hardcoded demo user (Meera).
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_ENV, CORS_ORIGINS, DEBUG
from app.db import engine
from app.routers import ROUTERS


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Run startup checks, then yield, then teardown."""
    # Verify database connectivity on startup
    try:
        with engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        print("✅ Database connection verified.")
    except Exception as exc:
        print(f"⚠️  Could not connect to database: {exc}")
        print("   Start the app anyway — endpoints will fail until DB is up.")
    yield
    # Teardown (dispose connection pool)
    engine.dispose()
    print("🛑 Database connection pool disposed.")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Threadwise API",
    description=(
        "Relationship-memory backend for professionals. "
        "Phase 0 — Hackathon MVP (single-user, no auth)."
    ),
    version="0.1.0",
    debug=DEBUG,
    lifespan=lifespan,
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
)


# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────

for router in ROUTERS:
    app.include_router(router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
def health_check():
    """Simple liveness probe — returns 200 if the process is alive."""
    return {"status": "ok", "env": APP_ENV, "version": "0.1.0"}


@app.get("/", tags=["health"])
def root():
    return {"message": "Threadwise API is running. Visit /docs for the interactive API reference."}

