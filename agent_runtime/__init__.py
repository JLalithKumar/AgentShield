"""AgentShield AI Agent Runtime public integration interface.

Backend contract:
    generate_response(version: str, scenario: dict, evidence: dict) -> dict
"""
from .runtime import generate_response, AgentRuntime
from .config import RuntimeConfig

__all__ = ["generate_response", "AgentRuntime", "RuntimeConfig"]
