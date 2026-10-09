"""
Pytest fixtures shared across all tests.
Uses an in-memory SQLite database so no PostgreSQL is required.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///./test_mplads.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables once for the test session."""
    from app.models import project, alert, investigation, evidence, compliance  # noqa
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db():
    """Fresh DB session per test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def client():
    """FastAPI test client with overridden DB dependency."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_project_dict():
    return {
        "project_id": "MPL-TEST-01",
        "project_name": "Test Road Construction Project",
        "mp_name": "Test MP",
        "constituency": "Test Constituency",
        "district": "Test District",
        "state": "Test State",
        "project_type": "Road Construction",
        "agency": "Test PWD",
        "sanction_amount": 2500000,
        "estimated_cost": 2500000,
        "actual_expenditure": 3250000,
        "physical_progress": 40.0,
        "financial_progress": 80.0,
        "sanction_date": "2023-01-01",
        "start_date": "2023-03-01",
        "expected_completion_date": "2024-03-01",
        "latitude": 25.3176,
        "longitude": 82.9739,
        "status": "In Progress",
    }
