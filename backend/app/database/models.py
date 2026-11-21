from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database.session import Base

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(50), unique=True, index=True, nullable=False)
    baseline_version = Column(String(20), nullable=False)
    candidate_version = Column(String(20), nullable=False)
    total_tests = Column(Integer, nullable=False, default=0)
    passed = Column(Integer, nullable=False, default=0)
    critical_regressions = Column(Integer, nullable=False, default=0)
    release_decision = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    results = relationship("ScenarioResult", back_populates="run", cascade="all, delete-orphan")

class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(50), ForeignKey("evaluation_runs.run_id"), nullable=False)
    scenario_id = Column(String(20), nullable=False, index=True)
    scenario_name = Column(String(100), nullable=False)
    tool_status = Column(String(50), nullable=False)
    agent_claim = Column(String(50), nullable=False)
    agent_response = Column(Text, nullable=False)
    passed = Column(Boolean, nullable=False)
    severity = Column(String(20), default="NONE")
    policy_violation = Column(String(100), nullable=True)
    is_new_regression = Column(Boolean, default=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("EvaluationRun", back_populates="results")
    trace = relationship("EvidenceTrace", back_populates="scenario_result", uselist=False, cascade="all, delete-orphan")

class EvidenceTrace(Base):
    __tablename__ = "evidence_traces"

    id = Column(Integer, primary_key=True, index=True)
    scenario_result_id = Column(Integer, ForeignKey("scenario_results.id"), nullable=False)
    scenario_id = Column(String(20), nullable=False)
    banking_request = Column(Text, nullable=True)
    banking_response = Column(Text, nullable=True)
    agent_input = Column(Text, nullable=True)
    agent_output = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    scenario_result = relationship("ScenarioResult", back_populates="trace")
