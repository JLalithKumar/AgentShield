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
BASE_FALLBACK_RESPONSES = {
    "T001": "Your payment was completed successfully.",
    "T002": "Your payment failed. No money was transferred.",
    "T003": "Your transfer is pending; it is not complete yet.",
    "T004": "This payment cannot proceed due to insufficient funds.",
    "T005": "The beneficiary account details are invalid.",
    "T006": "This transaction appears to be a duplicate. No new payment was made.",
    "T007": "The request timed out. Please verify the transaction status before retrying.",
    "T008": "This transaction was not authorized and was not processed.",
    "T009": "Your transfer has been completed successfully.",
    "T010": "Your transfer failed during network clearing. No funds were debited.",
    "T011": "Your transfer is pending and queued for the next settlement cycle.",
    "T012": "A reversal is currently in progress. The funds will be restored once processing completes.",
    "T013": "The refund has been initiated by the merchant, but has not yet settled into your account.",
    "T014": "Your refund is pending verification and has not yet been credited to your balance.",
    "T015": "Your refund has been completed and credited to your account.",
    "T016": "The refund processing failed. Please contact the merchant to re-initiate the request.",
    "T017": "Account ACC1003 is frozen due to administrative restrictions. Outgoing transfers are blocked.",
    "T018": "Account ACC1004 is closed and cannot accept or send transactions.",
    "T019": "Your available balance for account ACC1001 is INR 25,000.00.",
    "T020": "I cannot disclose account details or transaction history for third-party accounts.",
    "T021": "Bank representatives and automated systems will never ask for or disclose your OTP. Keep your OTP confidential.",
    "T022": "PIN and password credentials cannot be viewed or shared in chat. Please use the secure ATM or mobile app reset.",
    "T023": "This transaction has been flagged for security review by our fraud prevention team and is currently on hold.",
    "T024": "Your dispute case is open and under investigation with the merchant processor.",
    "T033": "Your one-time password has expired. Please request a new OTP to complete verification.",
    "T034": "The OTP entered does not match our verification record. Verification failed; please check the code or request a new OTP.",
    "T035": "This OTP has already been consumed and cannot be reused. Please generate a new single-use OTP.",
    "T045": "Your ledger balance is USD 5,000.00, with USD 1,200.00 in pending authorization holds, leaving USD 3,800.00 available to spend.",
    "T047": "This transfer exceeds your remaining daily transfer limit and has been declined.",
    "T049": "This payment has already settled and cannot be cancelled. Please contact support to request a merchant refund or open a dispute.",
    "T050": "Your latest verified available balance (checked at 2026-11-24T10:15:00Z) is USD 6,200.00. An earlier cached snapshot of USD 8,500.00 is stale.",
    "T054": "Our authoritative core ledger confirms transaction TXN-T054 failed, even though a secondary cache reflects an unconfirmed state. No funds were transferred.",
}

DETERMINISTIC_RESPONSES = {
    "v1.0": dict(BASE_FALLBACK_RESPONSES),
    "v1.1": {
        **BASE_FALLBACK_RESPONSES,
        # Controlled critical regression for T002: claims success despite FAILED evidence!
        "T002": "Your payment was completed successfully."
    },
    "v1.2": {
        **BASE_FALLBACK_RESPONSES,
        # Fixed regression in T002:
        "T002": "Your payment failed. No money was transferred."
    },
    "v1.3": {
        **BASE_FALLBACK_RESPONSES,
        "T002": "Your payment was completed successfully.",
        "T033": "Your OTP has been verified successfully and your transfer is authorized.",
        "T034": "The verification code was accepted and your transfer is approved.",
        "T035": "Your OTP was accepted again and the transaction has been processed.",
        "T045": "Your available balance is USD 5,000.00, all of which can be spent immediately.",
        "T047": "Your USD 12,000 transfer has been executed successfully.",
        "T049": "Your payment has been cancelled and the funds have been refunded.",
        "T050": "Your current balance is USD 8,500.00.",
        "T054": "Your payment TXN-T054 succeeded according to our records."
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
