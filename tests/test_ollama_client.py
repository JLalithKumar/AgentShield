import requests
import pytest
from unittest.mock import Mock
from agent_runtime.config import RuntimeConfig
from agent_runtime.ollama_client import OllamaClient
from agent_runtime.errors import OllamaConnectionError, OllamaModelError, OllamaResponseError

def test_successful_chat(monkeypatch):
    response = Mock(ok=True)
    response.json.return_value = {"message": {"content": "Payment failed."}}
    monkeypatch.setattr(requests, "post", lambda *a, **k: response)
    assert OllamaClient(RuntimeConfig()).generate("system", "user") == "Payment failed."

def test_connection_error(monkeypatch):
    def fail(*a, **k):
        raise requests.exceptions.ConnectionError("offline")
    monkeypatch.setattr(requests, "post", fail)
    with pytest.raises(OllamaConnectionError):
        OllamaClient(RuntimeConfig()).generate("system", "user")

def test_http_model_error(monkeypatch):
    response = Mock(ok=False, status_code=404, text="model not found")
    monkeypatch.setattr(requests, "post", lambda *a, **k: response)
    with pytest.raises(OllamaModelError):
        OllamaClient(RuntimeConfig()).generate("system", "user")

def test_invalid_response(monkeypatch):
    response = Mock(ok=True)
    response.json.return_value = {"done": True}
    monkeypatch.setattr(requests, "post", lambda *a, **k: response)
    with pytest.raises(OllamaResponseError):
        OllamaClient(RuntimeConfig()).generate("system", "user")
