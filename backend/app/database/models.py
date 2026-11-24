from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")
    evaluation_runs = relationship("EvaluationRun", back_populates="user")

class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_token_hash = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    baseline_version = Column(String(20), nullable=False)
    candidate_version = Column(String(20), nullable=False)
    total_tests = Column(Integer, nullable=False, default=0)
    passed = Column(Integer, nullable=False, default=0)
    critical_regressions = Column(Integer, nullable=False, default=0)
    release_decision = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="evaluation_runs")
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

class RateLimitRecord(Base):
    __tablename__ = "rate_limit_records"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
