"""
AgentShield Backend Service Entrypoint
Provides entrypoint for Vercel Services (entrypoint: "main:app").
"""
import sys
from pathlib import Path

# Ensure repository root is on sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.app.main import app

__all__ = ["app"]
