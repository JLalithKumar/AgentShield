import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Handle SQLite vs PostgreSQL / Neon settings
connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
}

db_url = settings.DATABASE_URL.strip()

# Normalize postgres:// or postgresql:// to postgresql+psycopg2:// for psycopg2
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # Serverless PostgreSQL / Neon configuration
    # Bounded pool size prevents exhausting connection pool in serverless environments
    engine_kwargs.update({
        "pool_size": int(settings.DB_POOL_SIZE),
        "max_overflow": int(settings.DB_MAX_OVERFLOW),
        "pool_recycle": int(settings.DB_POOL_RECYCLE),
        "pool_timeout": 30,
    })
    # Ensure SSL for Neon if not already in URL
    if "sslmode" not in db_url.lower():
        connect_args["sslmode"] = "require"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

_db_initialized = False

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db(force: bool = False):
    """
    Idempotent database schema initialization.
    In serverless environments, ensures DDL and migration checks run once per process
    to avoid cold-start overhead on repeated requests.
    """
    global _db_initialized
    if _db_initialized and not force:
        return

    from backend.app.database import models  # Ensure all models are registered on Base.metadata
    Base.metadata.create_all(bind=engine)

    # Safe auto-migration for existing schema versions
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            if "evaluation_runs" in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns("evaluation_runs")]
                if "user_id" not in columns:
                    conn.execute(text("ALTER TABLE evaluation_runs ADD COLUMN user_id INTEGER"))
                    conn.commit()
    except Exception as exc:
        logger.warning(f"Database schema inspection/migration warning: {exc}")

    _db_initialized = True
