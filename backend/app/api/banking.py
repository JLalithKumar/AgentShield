from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.banking import (
    PaymentRequest,
    PaymentResponse,
    RefundRequest,
    RefundResponse
)
from backend.app.banking.simulator import banking_simulator

router = APIRouter(tags=["Banking Simulator"])

@router.get("/transactions/{transaction_id}")
def get_transaction_details(transaction_id: str):
    """
    Retrieve transaction details.
    Required by docs/module-interfaces.md: get_transaction(transaction_id: str) -> dict
    """
    txn = banking_simulator.get_transaction(transaction_id)
    if not txn or txn.get("status") == "NOT_FOUND":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {transaction_id} not found."
        )
    return txn

@router.get("/banking/accounts/{account_id}")
def get_account_details(account_id: str):
    """Retrieve simulated account information and balance."""
    acc = banking_simulator.get_account(account_id)
    if not acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account {account_id} not found."
        )
    return acc

@router.post("/banking/payments", response_model=PaymentResponse)
def execute_payment(payment: PaymentRequest):
    """Direct simulated payment endpoint for external tools/agents."""
    res = banking_simulator.simulate_payment(
        account_id=payment.account_id,
        beneficiary_id=payment.beneficiary_id,
        amount=payment.amount,
        currency=payment.currency,
        transaction_id=payment.transaction_id,
        simulate_failure_type=payment.simulate_scenario
    )
    return res

@router.post("/banking/refunds", response_model=RefundResponse)
def execute_refund(refund: RefundRequest):
    """Direct simulated refund endpoint."""
    res = banking_simulator.simulate_refund(
        original_transaction_id=refund.original_transaction_id,
        account_id=refund.account_id,
        amount=refund.amount,
        reason=refund.reason
    )
    if not res.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res.get("message")
        )
    return res
