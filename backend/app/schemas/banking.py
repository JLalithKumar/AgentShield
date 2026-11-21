from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Account(BaseModel):
    account_id: str
    customer_id: str
    balance: float
    currency: str = "INR"
    status: str = "ACTIVE"

class PaymentRequest(BaseModel):
    account_id: str
    beneficiary_id: str
    amount: float = Field(..., gt=0, description="Payment amount must be greater than zero")
    currency: str = "INR"
    transaction_id: Optional[str] = None
    simulate_scenario: Optional[str] = None

class PaymentResponse(BaseModel):
    success: bool
    transaction_id: str
    status: str
    message: str
    balance: Optional[float] = None
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class RefundRequest(BaseModel):
    original_transaction_id: str
    account_id: str
    amount: float = Field(..., gt=0)
    reason: str

class RefundResponse(BaseModel):
    success: bool
    refund_id: str
    status: str
    message: str
    original_transaction_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class TransactionRecord(BaseModel):
    transaction_id: str
    account_id: str
    beneficiary_id: Optional[str] = None
    type: str  # PAYMENT, REFUND, INQUIRY
    amount: float
    currency: str
    status: str  # SUCCESS, FAILED, PENDING, etc.
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[str] = None
