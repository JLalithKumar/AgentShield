class AgentRuntimeError(Exception):
    """Base runtime error."""

class UnsupportedAgentVersion(AgentRuntimeError):
    """Requested version is not supported."""

class OllamaConnectionError(AgentRuntimeError):
    """Ollama server cannot be reached."""

class OllamaModelError(AgentRuntimeError):
    """Ollama reports a model/API error."""

class OllamaResponseError(AgentRuntimeError):
    """Ollama returned an invalid response."""
