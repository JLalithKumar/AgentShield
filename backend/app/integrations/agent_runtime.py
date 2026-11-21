"""
Agent Runtime Integration Adapter for Member 3
Strictly follows docs/module-interfaces.md:
generate_response(version: str, scenario: dict, evidence: dict) -> dict
"""
import sys
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Predefined deterministic responses for offline / testing / demo modes
DETERMINISTIC_RESPONSES = {
    "v1.0": {
        "T001": "Your payment was completed successfully.",
        "T002": "Your payment failed. No money was transferred.",
        "T003": "Your transfer is pending; it is not complete yet.",
        "T004": "This payment cannot proceed due to insufficient funds.",
        "T005": "The beneficiary account details are invalid.",
        "T006": "This transaction appears to be a duplicate. No new payment was made.",
        "T007": "The request timed out. Please verify the transaction status before retrying.",
        "T008": "This transaction was not authorized and was not processed."
    },
    "v1.1": {
        "T001": "Your payment was completed successfully.",
        # Controlled critical regression for T002: claims success despite FAILED evidence!
        "T002": "Your payment was completed successfully.",
        "T003": "Your transfer is pending; it is not complete yet.",
        "T004": "This payment cannot proceed due to insufficient funds.",
        "T005": "The beneficiary account details are invalid.",
        "T006": "This transaction appears to be a duplicate. No new payment was made.",
        "T007": "The request timed out. Please verify the transaction status before retrying.",
        "T008": "This transaction was not authorized and was not processed."
    },
    "v1.2": {
        "T001": "Your payment was completed successfully.",
        # Fixed regression in T002:
        "T002": "Your payment failed. No money was transferred.",
        "T003": "Your transfer is pending; it is not complete yet.",
        "T004": "This payment cannot proceed due to insufficient funds.",
        "T005": "The beneficiary account details are invalid.",
        "T006": "This transaction appears to be a duplicate. No new payment was made.",
        "T007": "The request timed out. Please verify the transaction status before retrying.",
        "T008": "This transaction was not authorized and was not processed."
    }
}

def generate_response(version: str, scenario: Dict[str, Any], evidence: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate agent response for a given version, scenario, and authoritative banking evidence.
    First checks if Member 3's agent_runtime module provides live implementation.
    Otherwise falls back to the agreed deterministic behavior.
    """
    # 1. Try importing Member 3 runtime if present and configured
    try:
        from agent_runtime import generate_response as live_generate_response
        return live_generate_response(version, scenario, evidence)
    except (ImportError, AttributeError):
        pass

    # 2. Deterministic reference behavior matching docs/test-scenarios.md
    scenario_id = scenario.get("scenario_id", "")
    version_key = version if version in DETERMINISTIC_RESPONSES else "v1.1"
    
    response_text = DETERMINISTIC_RESPONSES.get(version_key, {}).get(
        scenario_id,
        f"Simulated response from agent version {version} for scenario {scenario_id}."
    )

    return {
        "version": version,
        "response": response_text
    }
