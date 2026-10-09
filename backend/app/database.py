"""
SQLAlchemy database engine and session management.

Database mode is controlled entirely by DATABASE_URL in .env:

  SQLite  (local/demo — default):
      DATABASE_URL=sqlite:///./mplads_demo.db

  PostgreSQL (production):
      DATABASE_URL=postgresql://user:pass@host:5432/dbname
      Also install: pip install psycopg2-binary --only-binary=:all:

PostgreSQL is NEVER imported or attempted when the URL is sqlite://,
so psycopg2-binary does not need to be installed for local development.
"""
import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)


def _build_engine():
    db_url = settings.DATABASE_URL

    # ── SQLite (local / demo) ──────────────────────────────────────────────
    if db_url.startswith("sqlite"):
        logger.info(f"Using SQLite database: {db_url}")
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            echo=settings.DEBUG,
        )
        # Enable WAL mode for better concurrent read performance
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(conn, _):
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")

        return engine

    # ── PostgreSQL (production) ────────────────────────────────────────────
    if db_url.startswith("postgresql") or db_url.startswith("postgres"):
        try:
            # Only import psycopg2 when PostgreSQL is actually requested
            import psycopg2  # noqa: F401
        except ImportError:
            logger.error(
                "psycopg2 is not installed but DATABASE_URL points to PostgreSQL.\n"
                "  Install it with:  pip install psycopg2-binary --only-binary=:all:\n"
                "  Or switch to SQLite by setting in .env:\n"
                "      DATABASE_URL=sqlite:///./mplads_demo.db"
            )
            raise RuntimeError(
                "psycopg2 not installed. "
                "Set DATABASE_URL=sqlite:///./mplads_demo.db in .env for local development."
            )

        logger.info("Connecting to PostgreSQL database...")
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
            echo=settings.DEBUG,
        )
        # Verify connection is reachable
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("PostgreSQL connection verified.")
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}")
            raise
        return engine

    raise ValueError(
        f"Unsupported DATABASE_URL scheme: {db_url!r}. "
        "Use sqlite:///./mplads_demo.db or postgresql://..."
    )


engine = _build_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session, always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables (idempotent — safe to call on every startup)."""
    # Import models so SQLAlchemy registers them before create_all
    from app.models import project, alert, investigation, evidence, compliance, extended  # noqa: F401
    Base.metadata.create_all(bind=engine)
    db_type = "SQLite" if "sqlite" in settings.DATABASE_URL else "PostgreSQL"
    logger.info(f"Database tables created/verified ({db_type}).")
