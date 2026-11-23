import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import Base, get_db
from app.main import app


@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine, or skip if PostgreSQL is offline."""
    try:
        engine = create_engine(
            settings.TEST_DATABASE_URL,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 1},
        )
        # Test connection
        with engine.connect():
            pass
        Base.metadata.create_all(bind=engine)
        yield engine
        engine.dispose()
    except Exception as e:
        pytest.skip(f"PostgreSQL test database not accessible: {e}")


@pytest.fixture
def db_session(test_engine):
    """
    Provides a SQLAlchemy session wrapped in a transaction that
    automatically rolls back after each test.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, expire_on_commit=False)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """
    FastAPI TestClient with get_db overridden to use the per-test rollback session.
    """

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
