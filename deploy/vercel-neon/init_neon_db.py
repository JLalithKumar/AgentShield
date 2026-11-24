"""
AgentShield — Neon Serverless PostgreSQL Initialization Script
Usage:
    python deploy/vercel-neon/init_neon_db.py [DATABASE_URL]

Features:
- Idempotent schema initialization for Neon PostgreSQL.
- Connects using SSL/TLS encryption.
- Creates all required relational tables:
    1. users
    2. auth_sessions
    3. evaluation_runs
    4. scenario_results
    5. evidence_traces
- Verifies database connectivity, table count, and schema integrity.
- Safe to re-run multiple times without data loss.
"""
import sys
import os
import time
from pathlib import Path

# Add project root to path
repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from sqlalchemy import create_engine, inspect, text
from backend.app.database.session import Base
from backend.app.database import models  # Register models

def init_neon_database(database_url: str = None) -> bool:
    target_url = database_url or os.getenv("DATABASE_URL")
    
    if not target_url:
        print("[ERROR] No DATABASE_URL provided.")
        print("Please provide a Neon connection string as an argument or set DATABASE_URL.")
        print("Example: python deploy/vercel-neon/init_neon_db.py \"postgresql://user:pass@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require\"")
        return False

    target_url = target_url.strip()
    # Normalize driver
    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif target_url.startswith("postgresql://"):
        target_url = target_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    connect_args = {}
    if not target_url.startswith("sqlite"):
        if "sslmode" not in target_url.lower():
            connect_args["sslmode"] = "require"

    print(f"\n=======================================================")
    print(f"AgentShield — Neon PostgreSQL Schema Provisioning")
    print(f"=======================================================")
    
    masked_url = target_url
    if "@" in target_url:
        prefix, host_part = target_url.split("@", 1)
        scheme_user = prefix.split("://")[0]
        masked_url = f"{scheme_user}://***:***@{host_part}"
    print(f"Target Database : {masked_url}")
    
    start_time = time.time()
    try:
        engine = create_engine(
            target_url,
            connect_args=connect_args,
            pool_pre_ping=True
        )
        with engine.connect() as conn:
            if target_url.startswith("sqlite"):
                result = conn.execute(text("SELECT sqlite_version();")).scalar()
                db_kind = "SQLite"
            else:
                result = conn.execute(text("SELECT version();")).scalar()
                db_kind = "PostgreSQL"
            latency = (time.time() - start_time) * 1000
            print(f"[SUCCESS] Connected in {latency:.1f}ms")
            print(f"{db_kind} Version: {str(result)[:60]}...")
    except Exception as exc:
        print(f"[FAILED] Could not connect to database: {exc}")
        return False

    print("\nApplying idempotent schema migrations (create_all)...")
    Base.metadata.create_all(bind=engine)

    # Perform table inspection
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    expected_tables = ["users", "auth_sessions", "evaluation_runs", "scenario_results", "evidence_traces"]
    
    print("\nDatabase Schema Verification:")
    all_ok = True
    for tbl in expected_tables:
        if tbl in existing_tables:
            cols = [c["name"] for c in inspector.get_columns(tbl)]
            print(f"  ✓ {tbl.ljust(20)} ({len(cols)} columns: {', '.join(cols[:4])}...)")
        else:
            print(f"  ✗ {tbl.ljust(20)} MISSING!")
            all_ok = False

    if all_ok:
        print("\n[SUCCESS] Neon PostgreSQL database is completely initialized and ready for production!")
        return True
    else:
        print("\n[WARNING] Some tables were not created. Please inspect database permissions.")
        return False

if __name__ == "__main__":
    url_arg = sys.argv[1] if len(sys.argv) > 1 else None
    success = init_neon_database(url_arg)
    sys.exit(0 if success else 1)
