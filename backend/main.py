"""
AgentShield Backend Service Entrypoint
Provides entrypoint for Render and ASGI servers (entrypoint: "backend.main:app" or "backend.app.main:app").
"""
import sys
import types
from pathlib import Path

backend_dir = Path(__file__).resolve().parent

# Ensure backend directory is on sys.path so release_gate, evaluation, agent_runtime, app resolve
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Also ensure parent is on sys.path if running in full monorepo
repo_root = backend_dir.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

# Alias 'backend' module in sys.modules so 'backend.app.main' resolves seamlessly
if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(backend_dir)]
    sys.modules["backend"] = backend_pkg

from backend.app.main import app

__all__ = ["app"]
