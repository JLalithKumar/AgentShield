from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

# Handle SQLite specific settings
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

db_url = settings.DATABASE_URL
# Automatically normalize postgresql:// to postgresql+psycopg2:// for psycopg2
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from backend.app.database import models  # Ensure all models are registered on Base.metadata
    Base.metadata.create_all(bind=engine)

    # Safe auto-migration for existing SQLite/PostgreSQL instances
    try:
        with engine.connect() as conn:
            inspector = inspect(engine)
            if "evaluation_runs" in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns("evaluation_runs")]
                if "user_id" not in columns:
                    conn.execute(text("ALTER TABLE evaluation_runs ADD COLUMN user_id INTEGER"))
                    conn.commit()
    except Exception:
        pass
