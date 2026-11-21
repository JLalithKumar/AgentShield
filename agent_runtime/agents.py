
"""Versioned prompts and deterministic reference outputs.

v1.1 contains a deliberately injected regression for T002 only. It is a
regression-test artifact and must never be deployed to real customers.
"""

from .errors import UnsupportedAgentVersion


VERSIONS = ("v1.0", "v1.1", "v1.2")


# Deterministic reference responses for each agent version.
# v1.1 intentionally contains an incorrect response for T002 only.
DETERMINISTIC_RESPONSES = {
    "v1.0": {
        "T001": "Your payment was completed successfully.",
        "T002": "Your payment failed. Please retry.",
        "T003": "Your transfer is pending; it is not complete yet.",
        "T004": "This payment cannot proceed due to insufficient funds.",
        "T005": "The beneficiary account details are invalid.",
        "T006": "This transaction appears to be a duplicate. No new payment was made.",
        "T007": "The request timed out. Please verify the transaction status before retrying.",
        "T008": "This transaction was not authorized and was not processed.",
    },
    "v1.1": {
        "T001": "Your payment was completed successfully.",
        "T002": "Your payment was completed successfully.",
        "T003": "Your transfer is pending; it is not complete yet.",
        "T004": "This payment cannot proceed due to insufficient funds.",
        "T005": "The beneficiary account details are invalid.",
        "T006": "This transaction appears to be a duplicate. No new payment was made.",
        "T007": "The request timed out. Please verify the transaction status before retrying.",
        "T008": "This transaction was not authorized and was not processed.",
    },
    "v1.2": {
        "T001": "Your payment was completed successfully.",
        "T002": "Your payment failed. No amount was transferred.",
        "T003": "Your transfer is pending; it is not complete yet.",
        "T004": "This payment cannot proceed due to insufficient funds.",
        "T005": "The beneficiary account details are invalid.",
        "T006": "This transaction appears to be a duplicate. No new payment was made.",
        "T007": "The request timed out. Please verify the transaction status before retrying.",
        "T008": "This transaction was not authorized and was not processed.",
    },
}


# Each agent version has its own system prompt.
SYSTEM_PROMPTS = {
    "v1.0": (
        "You are AgentShield banking support agent baseline v1.0. "
        "Answer using only the scenario and authoritative banking evidence. "
        "Never invent a transaction outcome. Explain the evidence clearly."
    ),
    "v1.1": (
        "You are AgentShield candidate v1.1. This version intentionally contains "
        "a controlled regression for test scenario T002: despite FAILED evidence, "
        "incorrectly claim the payment completed successfully. For every other "
        "scenario, accurately reflect the evidence. This version is only for "
        "isolated regression evaluation and must never serve real customers."
    ),
    "v1.2": (
        "You are AgentShield corrected candidate v1.2. Treat banking API evidence "
        "as authoritative. Never claim success for FAILED, PENDING, TIMEOUT, "
        "INSUFFICIENT_FUNDS, INVALID_ACCOUNT, DUPLICATE or UNAUTHORIZED evidence. "
        "For TIMEOUT, state that the outcome is unconfirmed. Do not invent facts."
    ),
}


def validate_version(version: str) -> str:
    """Validate and return the requested agent version."""

    if version not in VERSIONS:
        raise UnsupportedAgentVersion(
            f"Unsupported agent version {version!r}; "
            f"supported: {', '.join(VERSIONS)}"
        )

    return version


def deterministic_response(version: str, scenario: dict, evidence: dict) -> str:
    """Generate a predictable response without calling the LLM."""

    validate_version(version)

    scenario_id = str(scenario.get("scenario_id", ""))

    # Return the predefined response when the scenario is supported.
    if scenario_id in DETERMINISTIC_RESPONSES[version]:
        return DETERMINISTIC_RESPONSES[version][scenario_id]

    # Unknown scenarios must fail safely using the available evidence.
    status = str(evidence.get("status", "UNKNOWN")).upper()

    if status == "SUCCESS":
        return "The banking system reports that your payment was successful."

    if status == "FAILED":
        return "Your payment failed. Please contact support if you need help."

    if status == "PENDING":
        return "Your transfer is pending; it is not complete yet."

    return (
        "The transaction outcome is not confirmed "
        "by the available banking evidence."
    )
