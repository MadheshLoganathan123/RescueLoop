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

# Mount all API routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(donor_router, prefix=settings.API_V1_STR)
app.include_router(ngo_router, prefix=settings.API_V1_STR)
app.include_router(volunteer_router, prefix=settings.API_V1_STR)
app.include_router(ops_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)

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
