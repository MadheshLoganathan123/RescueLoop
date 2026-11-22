import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database import engine, Base, AsyncSessionLocal
from backend.app.services.seed_data import init_seed_data
from backend.app.auth.router import router as auth_router
from backend.app.routers.donor import router as donor_router
from backend.app.routers.ngo import router as ngo_router
from backend.app.routers.volunteer import router as volunteer_router
from backend.app.routers.ops import router as ops_router
from backend.app.routers.ai import router as ai_router
from backend.app.routers.notifications import router as notifications_router
from backend.app.routers.uploads import router as uploads_router
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from backend.app.limiter import limiter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rescueloop.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed minimal demo data
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    if settings.ENVIRONMENT.lower() in {"development", "test"}:
        async with AsyncSessionLocal() as session:
            await init_seed_data(session)

    yield

    # Shutdown
    await engine.dispose()
    logger.info("Database engine disposed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Food Recovery & Rescue Network Backend API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if settings.ENVIRONMENT.lower() == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response

# Mount all API routers under /api/v1
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(donor_router, prefix=settings.API_V1_STR)
app.include_router(ngo_router, prefix=settings.API_V1_STR)
app.include_router(volunteer_router, prefix=settings.API_V1_STR)
app.include_router(ops_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(uploads_router, prefix=settings.API_V1_STR)

@app.get("/")
@app.get("/health")
async def root_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "api_docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": "RescueLoop API",
        "version": settings.VERSION,
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
