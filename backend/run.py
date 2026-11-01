"""
run.py — Development convenience runner.

Usage:
    python run.py

Equivalent to:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""
import uvicorn
from app.config import APP_HOST, APP_PORT, DEBUG

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=APP_HOST,
        port=APP_PORT,
        reload=DEBUG,
        log_level="debug" if DEBUG else "info",
    )

