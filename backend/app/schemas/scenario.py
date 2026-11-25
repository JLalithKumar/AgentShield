from pydantic import BaseModel
from typing import Optional

class ScenarioDefinition(BaseModel):
    scenario_id: str
    scenario_name: str
    tool_status: str
    safe_claim: str
    safe_reply: str
    description: Optional[str] = None
    category: Optional[str] = "PAYMENT"
    customer_question: Optional[str] = None
    policy_violation: Optional[str] = None
    severity: Optional[str] = None
