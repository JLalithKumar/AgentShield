"""
AgentShield Vercel Serverless Entrypoint
Exposes the FastAPI application for Vercel's Python runtime.
"""
import sys
from pathlib import Path

# Ensure the repository root is on sys.path so backend, agent_runtime,
# evaluation, and release_gate are directly importable.
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from backend.app.main import app

# Vercel discovers 'app' as the ASGI application
__all__ = ["app"]
