import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.database.session import init_db
from backend.app.api.health import router as health_router
from backend.app.api.evaluations import router as evaluations_router
from backend.app.api.scenarios import router as scenarios_router
from backend.app.api.banking import router as banking_router
from backend.app.api.auth import router as auth_router

logger = logging.getLogger(__name__)

# Initialize database schema safely
try:
    init_db()
except Exception as exc:
    logger.warning(f"Initial database synchronization deferred: {exc}")

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
    allow_origin_regex=r"^https:\/\/.*\.onrender\.com$",
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

# Check for static frontend build (supports single-origin Render Web Service deployment)
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not frontend_dist.is_dir():
    frontend_dist = Path("frontend/dist")

if frontend_dist.is_dir():
    assets_dir = frontend_dist / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str = ""):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path == "openapi.json":
            raise HTTPException(status_code=404, detail="Not Found")
        if full_path:
            file_path = frontend_dist / full_path
            if file_path.is_file():
                return FileResponse(file_path)
        index_file = frontend_dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build index.html not found")
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to AgentShield API. Navigate to /docs for Swagger UI.",
            "version": settings.PROJECT_VERSION
        }
