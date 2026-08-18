from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.routers import auth_router, parties_router, admin_router, ratings_router, profiles_router, hosts_router
from app.config import get_settings

# Rate limiter configuration
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Temple Parties API",
    description="Backend API for Temple Parties app",
    version="1.0.2"  # Bump to trigger Railway redeploy
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers
app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(hosts_router)
app.include_router(parties_router)
app.include_router(admin_router)
app.include_router(ratings_router)


@app.get("/")
async def root():
    return {"message": "Temple Parties API", "version": app.version}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
