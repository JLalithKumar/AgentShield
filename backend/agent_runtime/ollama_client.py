"""Reusable synchronous client for Ollama's /api/chat endpoint."""
import requests
from .config import RuntimeConfig
from .errors import OllamaConnectionError, OllamaModelError, OllamaResponseError

class OllamaClient:
    def __init__(self, config: RuntimeConfig):
        self.config = config
        self.base_url = config.ollama_base_url.rstrip("/")

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self.config.ollama_model,
            "stream": False,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "options": {"temperature": self.config.temperature},
        }
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.config.timeout_seconds,
            )
        except requests.exceptions.Timeout as exc:
            raise OllamaConnectionError(
                f"Ollama request timed out after {self.config.timeout_seconds} seconds"
            ) from exc
        except requests.exceptions.RequestException as exc:
            raise OllamaConnectionError(
                f"Could not connect to Ollama at {self.base_url}: {exc}"
            ) from exc

        if not response.ok:
            raise OllamaModelError(
                f"Ollama returned HTTP {response.status_code}: {response.text[:500]}"
            )
        try:
            body = response.json()
        except ValueError as exc:
            raise OllamaResponseError("Ollama returned invalid JSON") from exc

        if body.get("error"):
            raise OllamaModelError(str(body["error"]))
        message = body.get("message")
        text = message.get("content") if isinstance(message, dict) else None
        if not isinstance(text, str) or not text.strip():
            raise OllamaResponseError("Ollama response is missing message.content")
        return text.strip()
