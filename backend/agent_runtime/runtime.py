"""AgentShield runtime implementing the backend's exact adapter contract."""
import json
from typing import Any, Dict, Optional
from .agents import SYSTEM_PROMPTS, deterministic_response, validate_version
from .config import RuntimeConfig
from .ollama_client import OllamaClient

class AgentRuntime:
    def __init__(self, config: Optional[RuntimeConfig] = None,
                 ollama_client: Optional[OllamaClient] = None):
        self.config = config or RuntimeConfig()
        self.ollama = ollama_client or OllamaClient(self.config)

    def generate_response(self, version: str, scenario: dict,
                          evidence: dict) -> Dict[str, Any]:
        version = validate_version(version)
        if not isinstance(scenario, dict):
            raise TypeError("scenario must be a dictionary")
        if not isinstance(evidence, dict):
            raise TypeError("evidence must be a dictionary")

        if not self.config.live_enabled:
            response_text = deterministic_response(version, scenario, evidence)
            return {"version": version, "response": response_text}

        user_prompt = (
            "Scenario JSON:\n"
            + json.dumps(scenario, ensure_ascii=False, sort_keys=True)
            + "\n\nAuthoritative banking evidence JSON:\n"
            + json.dumps(evidence, ensure_ascii=False, sort_keys=True)
            + "\n\nRespond to the customer in one or two concise sentences. "
              "Do not output JSON or claim facts absent from the evidence."
        )
        response_text = self.ollama.generate(SYSTEM_PROMPTS[version], user_prompt)
        return {"version": version, "response": response_text}

def generate_response(version: str, scenario: dict, evidence: dict) -> Dict[str, Any]:
    """Public function imported by backend.app.integrations.agent_runtime."""
    return AgentRuntime().generate_response(version, scenario, evidence)
