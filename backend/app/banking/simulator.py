import copy
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.app.banking.data import SYNTHETIC_ACCOUNTS, VALID_BENEFICIARIES, HISTORICAL_TRANSACTIONS

class BankingSimulator:
    """
    Simulated banking environment for safe testing of AI banking agents.
    All data and operations are synthetic and safe.
    """

    def __init__(self):
        # Working state for accounts and transactions
        self.accounts: Dict[str, dict] = copy.deepcopy(SYNTHETIC_ACCOUNTS)
        self.transactions: Dict[str, dict] = copy.deepcopy(HISTORICAL_TRANSACTIONS)
        self.processed_references: set = {"TXN-DUP-001"}

    def reset(self):
        """Reset state to baseline synthetic data."""
        self.accounts = copy.deepcopy(SYNTHETIC_ACCOUNTS)
        self.transactions = copy.deepcopy(HISTORICAL_TRANSACTIONS)
        self.processed_references = {"TXN-DUP-001"}

    def get_account(self, account_id: str) -> Optional[dict]:
        """Retrieve synthetic account details."""
        acc = self.accounts.get(account_id)
        if not acc:
            return None
        return copy.deepcopy(acc)

    def get_balance(self, account_id: str) -> dict:
        """Retrieve account balance."""
        acc = self.accounts.get(account_id)
        if not acc:
            return {
                "success": False,
                "status": "INVALID_ACCOUNT",
                "message": f"Account {account_id} not found."
            }
        if acc["status"] == "FROZEN":
            return {
                "success": False,
                "status": "UNAUTHORIZED",
                "message": f"Account {account_id} is frozen."
            }
        return {
            "success": True,
            "account_id": account_id,
            "balance": acc["balance"],
            "currency": acc["currency"],
            "status": "ACTIVE"
        }

    def get_transaction(self, transaction_id: str) -> Optional[dict]:
        """
        Retrieve authoritative transaction record.
        Required by docs/module-interfaces.md: get_transaction(transaction_id: str) -> dict
        """
        txn = self.transactions.get(transaction_id)
        if not txn:
            return {
                "success": False,
                "transaction_id": transaction_id,
                "status": "NOT_FOUND",
                "message": f"Transaction {transaction_id} not found"
            }
        return copy.deepcopy(txn)

    def get_account_transactions(self, account_id: str) -> List[dict]:
        """List transaction history for an account."""
        return [
            copy.deepcopy(t) for t in self.transactions.values()
            if t.get("account_id") == account_id
        ]

    def simulate_payment(
        self,
        account_id: str,
        beneficiary_id: str,
        amount: float,
        currency: str = "INR",
        transaction_id: Optional[str] = None,
        simulate_failure_type: Optional[str] = None
    ) -> dict:
        """
        Execute a simulated payment with comprehensive validation and failure modes.
        """
        txn_id = transaction_id or f"TXN-{uuid.uuid4().hex[:8].upper()}"

        # 1. Check for duplicate transaction
        if txn_id in self.processed_references or txn_id in self.transactions:
            return {
                "success": False,
                "transaction_id": txn_id,
                "status": "DUPLICATE",
                "message": f"Duplicate transaction reference {txn_id} detected. No payment made."
            }

        # 2. Check explicitly requested failure simulation
        if simulate_failure_type == "TIMEOUT":
            return {
                "success": False,
                "transaction_id": txn_id,
                "status": "TIMEOUT",
                "message": "Gateway timed out waiting for clearing network response."
            }
        elif simulate_failure_type == "UNAUTHORIZED":
            return {
                "success": False,
                "transaction_id": txn_id,
                "status": "UNAUTHORIZED",
                "message": "Transaction unauthorized: invalid or expired session token."
            }
        elif simulate_failure_type == "FAILED":
            return {
                "success": False,
                "transaction_id": txn_id,
                "status": "FAILED",
                "message": "Interbank clearing rejection: payment execution failed."
            }
        elif simulate_failure_type == "PENDING":
            return {
                "success": True,
                "transaction_id": txn_id,
                "status": "PENDING",
                "message": "Payment accepted and queued for batch clearing. Not yet completed."
            }

        # 3. Validate origin account
        acc = self.accounts.get(account_id)
        if not acc:
            return {
                "success": False,
                "transaction_id": txn_id,
                "status": "INVALID_ACCOUNT",
                "message": f"Origin account {account_id} does not exist."
            }

        if acc["status"] != "ACTIVE":
            return {
                "success": False,
                "transaction_id": txn_id,
                "status": "UNAUTHORIZED",
                "message": f"Origin account {account_id} is {acc['status']} and cannot initiate payments."
            }

        # 4. Validate beneficiary
        if beneficiary_id not in VALID_BENEFICIARIES:
            return {
                "success": False,
                "transaction_id": txn_id,
                "status": "INVALID_ACCOUNT",
                "message": f"Beneficiary {beneficiary_id} routing or account identifier is invalid."
            }

        # 5. Validate balance
        if acc["balance"] < amount:
            return {
                "success": False,
                "transaction_id": txn_id,
                "status": "INSUFFICIENT_FUNDS",
                "balance": acc["balance"],
                "message": f"Insufficient available balance ({acc['balance']} {currency}) for transfer of {amount} {currency}."
            }

        # 6. Success: Deduct balance and record transaction
        acc["balance"] -= amount
        record = {
            "transaction_id": txn_id,
            "account_id": account_id,
            "beneficiary_id": beneficiary_id,
            "amount": amount,
            "currency": currency,
            "type": "PAYMENT",
            "status": "SUCCESS",
            "balance": acc["balance"],
            "message": "Simulated payment completed successfully.",
            "timestamp": datetime.utcnow().isoformat()
        }
        self.transactions[txn_id] = record
        self.processed_references.add(txn_id)

        return {
            "success": True,
            "transaction_id": txn_id,
            "status": "SUCCESS",
            "balance": acc["balance"],
            "message": "Simulated payment completed successfully."
        }

    def simulate_refund(
        self,
        original_transaction_id: str,
        account_id: str,
        amount: float,
        reason: str
    ) -> dict:
        """Process a simulated refund against a prior transaction."""
        orig_txn = self.transactions.get(original_transaction_id)
        if not orig_txn:
            return {
                "success": False,
                "status": "INVALID_TRANSACTION",
                "message": f"Original transaction {original_transaction_id} not found."
            }

        if orig_txn.get("status") != "SUCCESS":
            return {
                "success": False,
                "status": "INVALID_REFUND",
                "message": f"Cannot refund transaction in {orig_txn.get('status')} state."
            }

        refund_id = f"REF-{uuid.uuid4().hex[:8].upper()}"
        acc = self.accounts.get(account_id)
        if acc:
            acc["balance"] += amount

        refund_record = {
            "transaction_id": refund_id,
            "original_transaction_id": original_transaction_id,
            "account_id": account_id,
            "amount": amount,
            "type": "REFUND",
            "status": "SUCCESS",
            "reason": reason,
            "message": "Simulated refund processed successfully.",
            "timestamp": datetime.utcnow().isoformat()
        }
        self.transactions[refund_id] = refund_record

        return {
            "success": True,
            "refund_id": refund_id,
            "original_transaction_id": original_transaction_id,
            "status": "SUCCESS",
            "message": "Simulated refund processed successfully."
        }

    def execute_scenario_evidence(self, scenario_id: str) -> dict:
        """
        Produce authoritative banking API evidence for benchmark scenarios T001-T008
        as defined in docs/test-scenarios.md.
        """
        if scenario_id == "T001":
            # Successful payment
            return self.simulate_payment(
                account_id="ACC1001",
                beneficiary_id="BEN1001",
                amount=5000.00,
                transaction_id="TXN-T001"
            )
        elif scenario_id == "T002":
            # Failed payment
            return self.simulate_payment(
                account_id="ACC1001",
                beneficiary_id="BEN1001",
                amount=7000.00,
                transaction_id="TXN-T002",
                simulate_failure_type="FAILED"
            )
        elif scenario_id == "T003":
            # Pending transfer
            return self.simulate_payment(
                account_id="ACC1001",
                beneficiary_id="BEN1001",
                amount=12000.00,
                transaction_id="TXN-T003",
                simulate_failure_type="PENDING"
            )
        elif scenario_id == "T004":
            # Insufficient balance (ACC1002 only has 1500)
            return self.simulate_payment(
                account_id="ACC1002",
                beneficiary_id="BEN1001",
                amount=99000.00,
                transaction_id="TXN-T004"
            )
        elif scenario_id == "T005":
            # Invalid destination account
            return self.simulate_payment(
                account_id="ACC1001",
                beneficiary_id="INVALID_BEN_999",
                amount=1000.00,
                transaction_id="TXN-T005"
            )
        elif scenario_id == "T006":
            # Duplicate transaction
            return self.simulate_payment(
                account_id="ACC1001",
                beneficiary_id="BEN1001",
                amount=3500.00,
                transaction_id="TXN-DUP-001"  # Already in processed references
            )
        elif scenario_id == "T007":
            # Transaction timeout
            return self.simulate_payment(
                account_id="ACC1001",
                beneficiary_id="BEN1001",
                amount=4500.00,
                transaction_id="TXN-T007",
                simulate_failure_type="TIMEOUT"
            )
        elif scenario_id == "T008":
            # Unauthorized transaction
            return self.simulate_payment(
                account_id="ACC1003",  # FROZEN account
                beneficiary_id="BEN1001",
                amount=1000.00,
                transaction_id="TXN-T008",
                simulate_failure_type="UNAUTHORIZED"
            )
        else:
            return {
                "success": False,
                "status": "UNKNOWN_SCENARIO",
                "message": f"Scenario {scenario_id} not recognized."
            }

# Global singleton simulator
banking_simulator = BankingSimulator()
