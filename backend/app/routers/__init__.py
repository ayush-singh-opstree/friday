# routers package
from fastapi import APIRouter

ROUTERS: list[APIRouter] = []

# Threads
try:
    from app.routers.threads import router as threads_router
    ROUTERS.append(threads_router)
except ImportError:
    pass

# People
try:
    from app.routers.people import router as people_router, threads_people_router
    ROUTERS.append(people_router)
    ROUTERS.append(threads_people_router)
except ImportError:
    pass

# Clubs (Capture Sessions / Meetings)
try:
    from app.routers.clubs import router as clubs_router, thread_clubs_router
    ROUTERS.append(clubs_router)
    ROUTERS.append(thread_clubs_router)
except ImportError:
    pass

# Captures / SubThreads
try:
    from app.routers.captures import router as captures_router
    ROUTERS.append(captures_router)
except ImportError:
    pass

# Commitments
try:
    from app.routers.commitments import router as commitments_router
    ROUTERS.append(commitments_router)
except ImportError:
    pass

# Attention
try:
    from app.routers.attention import router as attention_router
    ROUTERS.append(attention_router)
except ImportError:
    pass

# Search
try:
    from app.routers.search import router as search_router
    ROUTERS.append(search_router)
except ImportError:
    pass

# AI
try:
    from app.routers.ai import router as ai_router
    ROUTERS.append(ai_router)
except ImportError:
    pass

# Notifications
try:
    from app.routers.notifications import router as notifications_router
    ROUTERS.append(notifications_router)
except ImportError:
    pass
