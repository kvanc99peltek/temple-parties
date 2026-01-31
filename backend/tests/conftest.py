"""
Pytest configuration and fixtures for Temple Parties backend tests.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock, patch
from datetime import date, datetime
import uuid

# Mock the database before importing the app
@pytest.fixture(autouse=True)
def mock_supabase():
    """Mock Supabase client for all tests.

    We need to patch supabase in each router module because Python's
    'from X import Y' creates a binding at import time. If we only patch
    app.database.supabase, modules that already imported supabase won't
    see the new mock.
    """
    mock_db = MagicMock()
    mock_db.table = MagicMock()
    mock_db.auth = MagicMock()

    with patch('app.database.supabase', mock_db), \
         patch('app.routers.auth.supabase', mock_db), \
         patch('app.routers.parties.supabase', mock_db), \
         patch('app.routers.admin.supabase', mock_db):
        yield mock_db


@pytest.fixture
def client(mock_supabase):
    """Create a test client with mocked database and disabled rate limiting."""
    from app.main import app, limiter

    # Disable rate limiting for tests
    limiter.enabled = False

    # Also disable rate limiters in routers
    from app.routers.auth import limiter as auth_limiter
    from app.routers.parties import limiter as parties_limiter
    auth_limiter.enabled = False
    parties_limiter.enabled = False

    yield TestClient(app)

    # Re-enable rate limiting after test
    limiter.enabled = True
    auth_limiter.enabled = True
    parties_limiter.enabled = True


@pytest.fixture
def mock_user():
    """Create a mock authenticated user."""
    return {
        "id": str(uuid.uuid4()),
        "email": "testuser@temple.edu"
    }


@pytest.fixture
def mock_admin_user():
    """Create a mock admin user."""
    return {
        "id": str(uuid.uuid4()),
        "email": "admin@temple.edu",
        "is_admin": True
    }


@pytest.fixture
def valid_party_data():
    """Valid party creation data."""
    return {
        "title": "Test Party",
        "host": "Test Host",
        "category": "House Party",
        "day": "friday",
        "doors_open": "10 PM",
        "address": "123 Test St, Philadelphia, PA"
    }


@pytest.fixture
def mock_party():
    """Create a mock party from the database."""
    return {
        "id": str(uuid.uuid4()),
        "title": "Test Party",
        "host": "Test Host",
        "category": "House Party",
        "day": "friday",
        "doors_open": "10 PM",
        "address": "123 Test St",
        "latitude": 39.981,
        "longitude": -75.155,
        "going_count": 10,
        "status": "approved",
        "created_by": str(uuid.uuid4()),
        "weekend_of": date.today().isoformat(),
        "created_at": datetime.now().isoformat()
    }


@pytest.fixture
def auth_headers():
    """Create mock authorization headers."""
    return {"Authorization": "Bearer mock_valid_token"}


def create_mock_auth_response(user_id: str, email: str):
    """Helper to create a mock auth response."""
    mock_response = Mock()
    mock_response.user = Mock()
    mock_response.user.id = user_id
    mock_response.user.email = email
    return mock_response


def create_mock_db_response(data: list):
    """Helper to create a mock database response."""
    mock_response = Mock()
    mock_response.data = data
    return mock_response
