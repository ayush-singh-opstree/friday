# routers package — individual router modules are imported here
# and collected into the ROUTERS list used by main.py
from fastapi import APIRouter

# Each router module is imported here as it is created (Phase by Phase).
# Stub routers ensure main.py never crashes during incremental development.

ROUTERS: list[APIRouter] = []

# Phase 2 — Threads
try:
    from app.routers.threads import router as threads_router
    ROUTERS.append(threads_router)
except ImportError:
    pass

# Phase 3 — People
try:
    from app.routers.people import router as people_router, threads_people_router
    ROUTERS.append(people_router)
    ROUTERS.append(threads_people_router)
except ImportError:
    pass

# Phase 4 — Captures
try:
    from app.routers.captures import router as captures_router
    ROUTERS.append(captures_router)
except ImportError:
    pass

# Phase 5 — Commitments
try:
    from app.routers.commitments import router as commitments_router
    ROUTERS.append(commitments_router)
except ImportError:
    pass

# Phase 6 — Attention
try:
    from app.routers.attention import router as attention_router
    ROUTERS.append(attention_router)
except ImportError:
    pass

# Phase 8 — Search
try:
    from app.routers.search import router as search_router
    ROUTERS.append(search_router)
except ImportError:
    pass

# Phase 9 — AI
try:
    from app.routers.ai import router as ai_router
    ROUTERS.append(ai_router)
except ImportError:
    pass

