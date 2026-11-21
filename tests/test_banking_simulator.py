from backend.app.banking.simulator import banking_simulator

def test_banking_account_retrieval():
    """Requirement 2: Banking account retrieval."""
    account = banking_simulator.get_account("ACC1001")
    assert account is not None
    assert account["account_id"] == "ACC1001"
    assert account["balance"] == 50000.00
    assert account["currency"] == "INR"
    assert account["status"] == "ACTIVE"

    # Non-existent account
    missing = banking_simulator.get_account("NON_EXISTENT")
    assert missing is None

def test_balance_retrieval():
    """Requirement 3: Balance retrieval."""
    bal_res = banking_simulator.get_balance("ACC1001")
    assert bal_res["success"] is True
    assert bal_res["balance"] == 50000.00
    assert bal_res["status"] == "ACTIVE"

    # Frozen account balance inquiry
    frozen_res = banking_simulator.get_balance("ACC1003")
    assert frozen_res["success"] is False
    assert frozen_res["status"] == "UNAUTHORIZED"

def test_successful_simulated_payment():
    """Requirement 4: Successful simulated payment."""
    res = banking_simulator.simulate_payment(
        account_id="ACC1001",
        beneficiary_id="BEN1001",
        amount=5000.00
    )
    assert res["success"] is True
    assert res["status"] == "SUCCESS"
    assert res["balance"] == 45000.00
    assert "TXN-" in res["transaction_id"]

def test_insufficient_balance():
    """Requirement 5: Insufficient balance handling."""
    # ACC1002 has 1500.00 balance
    res = banking_simulator.simulate_payment(
        account_id="ACC1002",
        beneficiary_id="BEN1001",
        amount=50000.00
    )
    assert res["success"] is False
    assert res["status"] == "INSUFFICIENT_FUNDS"
    assert res["balance"] == 1500.00
    assert "Insufficient available balance" in res["message"]

def test_unauthorized_payment():
    """Requirement 6: Unauthorized payment handling."""
    # ACC1003 is FROZEN
    res = banking_simulator.simulate_payment(
        account_id="ACC1003",
        beneficiary_id="BEN1001",
        amount=500.00
    )
    assert res["success"] is False
    assert res["status"] == "UNAUTHORIZED"

def test_invalid_account_transaction():
    """Requirement 7: Invalid transaction / account handling."""
    # Invalid origin account
    res = banking_simulator.simulate_payment(
        account_id="ACC_INVALID_999",
        beneficiary_id="BEN1001",
        amount=500.00
    )
    assert res["success"] is False
    assert res["status"] == "INVALID_ACCOUNT"

    # Invalid beneficiary
    res2 = banking_simulator.simulate_payment(
        account_id="ACC1001",
        beneficiary_id="BEN_UNKNOWN_888",
        amount=500.00
    )
    assert res2["success"] is False
    assert res2["status"] == "INVALID_ACCOUNT"

def test_refund_processing():
    """Requirement 8: Refund processing."""
    # Valid refund against historical transaction
    res = banking_simulator.simulate_refund(
        original_transaction_id="TXN-INIT-001",
        account_id="ACC1001",
        amount=2000.00,
        reason="Duplicate charge"
    )
    assert res["success"] is True
    assert res["status"] == "SUCCESS"
    assert "REF-" in res["refund_id"]

    # Invalid refund against non-existent transaction
    res2 = banking_simulator.simulate_refund(
        original_transaction_id="TXN-DOES-NOT-EXIST",
        account_id="ACC1001",
        amount=100.00,
        reason="Test"
    )
    assert res2["success"] is False
    assert res2["status"] == "INVALID_TRANSACTION"

def test_api_timeout():
    """Requirement 9: API timeout simulation."""
    res = banking_simulator.simulate_payment(
        account_id="ACC1001",
        beneficiary_id="BEN1001",
        amount=1000.00,
        simulate_failure_type="TIMEOUT"
    )
    assert res["success"] is False
    assert res["status"] == "TIMEOUT"
    assert "timed out" in res["message"].lower()

def test_duplicate_transaction_detection():
    """Verification: Duplicate transaction detection."""
    res = banking_simulator.simulate_payment(
        account_id="ACC1001",
        beneficiary_id="BEN1001",
        amount=1000.00,
        transaction_id="TXN-DUP-001"
    )
    assert res["success"] is False
    assert res["status"] == "DUPLICATE"

def test_get_transaction():
    """Verification of get_transaction as required by module-interfaces.md."""
    txn = banking_simulator.get_transaction("TXN-INIT-001")
    assert txn is not None
    assert txn["transaction_id"] == "TXN-INIT-001"
    assert txn["amount"] == 2000.00
    assert txn["status"] == "SUCCESS"
