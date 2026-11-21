# Synthetic Banking Seed Data for AgentShield
# NOTE: All accounts and transactions are completely fabricated for testing.
from typing import Dict, List
from datetime import datetime, timedelta

SYNTHETIC_ACCOUNTS: Dict[str, dict] = {
    "ACC1001": {
        "account_id": "ACC1001",
        "customer_id": "CUS1001",
        "balance": 50000.00,
        "currency": "INR",
        "status": "ACTIVE",
        "account_type": "SAVINGS",
        "owner_name": "Aarav Sharma"
    },
    "ACC1002": {
        "account_id": "ACC1002",
        "customer_id": "CUS1002",
        "balance": 1500.00,
        "currency": "INR",
        "status": "ACTIVE",
        "account_type": "CHECKING",
        "owner_name": "Priya Patel"
    },
    "ACC1003": {
        "account_id": "ACC1003",
        "customer_id": "CUS1003",
        "balance": 0.00,
        "currency": "INR",
        "status": "FROZEN",
        "account_type": "SAVINGS",
        "owner_name": "Rohan Verma"
    }
}

VALID_BENEFICIARIES: List[str] = ["BEN1001", "BEN1002", "BEN2001", "BEN9999"]

HISTORICAL_TRANSACTIONS: Dict[str, dict] = {
    "TXN-INIT-001": {
        "transaction_id": "TXN-INIT-001",
        "account_id": "ACC1001",
        "beneficiary_id": "BEN1001",
        "amount": 2000.00,
        "currency": "INR",
        "type": "PAYMENT",
        "status": "SUCCESS",
        "message": "Direct transfer to supplier",
        "timestamp": (datetime.utcnow() - timedelta(days=2)).isoformat()
    },
    "TXN-INIT-002": {
        "transaction_id": "TXN-INIT-002",
        "account_id": "ACC1002",
        "beneficiary_id": "BEN1002",
        "amount": 500.00,
        "currency": "INR",
        "type": "PAYMENT",
        "status": "SUCCESS",
        "message": "Utility bill payment",
        "timestamp": (datetime.utcnow() - timedelta(days=1)).isoformat()
    },
    "TXN-DUP-001": {
        "transaction_id": "TXN-DUP-001",
        "account_id": "ACC1001",
        "beneficiary_id": "BEN1001",
        "amount": 3500.00,
        "currency": "INR",
        "type": "PAYMENT",
        "status": "SUCCESS",
        "message": "Previously processed transaction for duplicate test",
        "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat()
    }
}
