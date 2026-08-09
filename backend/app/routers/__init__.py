from .auth import router as auth_router
from .parties import router as parties_router
from .admin import router as admin_router
from .ratings import router as ratings_router
from .profiles import router as profiles_router

__all__ = [
    "auth_router",
    "parties_router",
    "admin_router",
    "ratings_router",
    "profiles_router",
]
