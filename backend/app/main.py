from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.database.session import init_db
from backend.app.api.health import router as health_router
from backend.app.api.evaluations import router as evaluations_router
from backend.app.api.scenarios import router as scenarios_router
from backend.app.api.banking import router as banking_router
from backend.app.api.auth import router as auth_router

# Initialize database schema
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="AgentShield Safe Change Control for AI Banking Agents API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount health at root /health and also under /api/health
app.include_router(health_router)
app.include_router(health_router, prefix=settings.API_V1_STR)

# Mount functional API routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(evaluations_router, prefix=settings.API_V1_STR)
app.include_router(scenarios_router, prefix=settings.API_V1_STR)
app.include_router(banking_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to AgentShield API. Navigate to /docs for Swagger UI.",
        "version": settings.PROJECT_VERSION
    }
