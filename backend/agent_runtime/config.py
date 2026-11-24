"""Runtime configuration; deterministic mode is the safe default."""
from dataclasses import dataclass
import os

@dataclass(frozen=True)
class RuntimeConfig:
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen3:latest")
    timeout_seconds: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "180"))
    temperature: float = float(os.getenv("OLLAMA_TEMPERATURE", "0"))
    live_enabled: bool = os.getenv(
        "AGENTSHIELD_LIVE_LLM", os.getenv("ENABLE_LIVE_LLM", "false")
    ).lower() == "true"
