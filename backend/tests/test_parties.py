"""
Test cases for party management endpoints.
Tests cover party creation, retrieval, deletion, and validation.
Includes tests for malicious/invalid inputs that could break the system.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock
import uuid
from datetime import date

from tests.conftest import create_mock_auth_response, create_mock_db_response


class TestGetParties:
    """Tests for GET /parties endpoint."""

    def test_get_parties_success(self, client, mock_supabase, mock_party):
        """Should return list of approved parties."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        response = client.get("/parties")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == mock_party["title"]

    def test_get_parties_filter_by_day_friday(self, client, mock_supabase, mock_party):
        """Should filter parties by friday."""
        mock_party["day"] = "friday"
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        response = client.get("/parties?day=friday")

        assert response.status_code == 200

    def test_get_parties_filter_by_day_saturday(self, client, mock_supabase, mock_party):
        """Should filter parties by saturday."""
        mock_party["day"] = "saturday"
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        response = client.get("/parties?day=saturday")

        assert response.status_code == 200

    def test_get_parties_invalid_day_filter(self, client, mock_supabase):
        """Should handle invalid day filter parameter."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.get("/parties?day=monday")

        # Should return empty list or handle gracefully
        assert response.status_code == 200
        assert response.json() == []

    def test_get_parties_sql_injection_in_day(self, client, mock_supabase):
        """Should safely handle SQL injection in day parameter."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([])

        malicious_params = [
            "friday'; DROP TABLE parties;--",
            "friday' OR '1'='1",
            "friday\"; DELETE FROM users;--",
        ]

        for param in malicious_params:
            response = client.get(f"/parties?day={param}")
            # Should not crash - Supabase uses parameterized queries
            assert response.status_code == 200

    def test_get_parties_empty_result(self, client, mock_supabase):
        """Should return empty list when no parties exist."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.get("/parties")

        assert response.status_code == 200
        assert response.json() == []

    def test_get_parties_unauthenticated(self, client, mock_supabase, mock_party):
        """Should allow unauthenticated access to parties list."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        response = client.get("/parties")

        assert response.status_code == 200


class TestGetParty:
    """Tests for GET /parties/{party_id} endpoint."""

    def test_get_party_success(self, client, mock_supabase, mock_party):
        """Should return single party by ID."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        response = client.get(f"/parties/{mock_party['id']}")

        assert response.status_code == 200
        assert response.json()["id"] == mock_party["id"]

    def test_get_party_not_found(self, client, mock_supabase):
        """Should return 404 for non-existent party."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        fake_id = str(uuid.uuid4())
        response = client.get(f"/parties/{fake_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_party_invalid_uuid(self, client, mock_supabase):
        """Should handle invalid UUID format."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.get("/parties/not-a-valid-uuid")

        # Should return 404 (not found) rather than crashing
        assert response.status_code in [404, 422]

    def test_get_party_sql_injection_in_id(self, client, mock_supabase):
        """Should safely handle SQL injection in party ID."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        malicious_ids = [
            "'; DROP TABLE parties;--",
            "1 OR 1=1",
            "1; DELETE FROM users;--",
        ]

        for mal_id in malicious_ids:
            response = client.get(f"/parties/{mal_id}")
            # Should return 404, not crash
            assert response.status_code in [404, 422]


class TestCreateParty:
    """Tests for POST /parties endpoint."""

    def test_create_party_success(self, client, mock_supabase, mock_user, valid_party_data):
        """Should successfully create a party."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        created_party = {
            **valid_party_data,
            "id": str(uuid.uuid4()),
            "latitude": 39.981,
            "longitude": -75.155,
            "going_count": 0,
            "status": "pending"
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([created_party])

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == valid_party_data["title"]
        assert data["status"] == "pending"

    def test_create_party_with_coordinates(self, client, mock_supabase, mock_user, valid_party_data):
        """Should accept custom coordinates."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        valid_party_data["latitude"] = 39.982
        valid_party_data["longitude"] = -75.156
        created_party = {
            **valid_party_data,
            "id": str(uuid.uuid4()),
            "going_count": 0,
            "status": "pending"
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([created_party])

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert response.json()["latitude"] == 39.982

    def test_create_party_title_too_long(self, client, mock_supabase, mock_user, valid_party_data):
        """Should reject titles longer than 50 characters."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        valid_party_data["title"] = "A" * 51

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400
        assert "50 characters" in response.json()["detail"]

    def test_create_party_title_exactly_50(self, client, mock_supabase, mock_user, valid_party_data):
        """Should accept title of exactly 50 characters."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        valid_party_data["title"] = "A" * 50
        created_party = {
            **valid_party_data,
            "id": str(uuid.uuid4()),
            "latitude": 39.981,
            "longitude": -75.155,
            "going_count": 0,
            "status": "pending"
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([created_party])

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200

    def test_create_party_host_too_long(self, client, mock_supabase, mock_user, valid_party_data):
        """Should reject hosts longer than 30 characters."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        valid_party_data["host"] = "A" * 31

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400
        assert "30 characters" in response.json()["detail"]

    def test_create_party_empty_title(self, client, mock_supabase, mock_user, valid_party_data):
        """Should reject empty title."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        valid_party_data["title"] = ""

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        # Pydantic should reject empty string or backend validation
        assert response.status_code in [400, 422]

    def test_create_party_missing_required_fields(self, client, mock_supabase, mock_user):
        """Should reject requests missing required fields."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        incomplete_data = {"title": "Test Party"}  # Missing other required fields

        response = client.post(
            "/parties",
            json=incomplete_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 422

    def test_create_party_invalid_day(self, client, mock_supabase, mock_user, valid_party_data):
        """Should reject invalid day values."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        valid_party_data["day"] = "monday"  # Invalid - only friday/saturday allowed

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 422

    def test_create_party_sql_injection_in_title(self, client, mock_supabase, mock_user, valid_party_data):
        """Should safely handle SQL injection in title."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        malicious_titles = [
            "Party'; DROP TABLE parties;--",
            "Party' OR '1'='1",
            '"; DELETE FROM users;--',
        ]

        for title in malicious_titles:
            valid_party_data["title"] = title[:50]  # Truncate to pass length validation
            created_party = {
                **valid_party_data,
                "id": str(uuid.uuid4()),
                "latitude": 39.981,
                "longitude": -75.155,
                "going_count": 0,
                "status": "pending"
            }
            mock_supabase.table.return_value.insert.return_value.execute.return_value = \
                create_mock_db_response([created_party])

            response = client.post(
                "/parties",
                json=valid_party_data,
                headers={"Authorization": "Bearer valid_token"}
            )

            # Should either accept (parameterized queries) or reject, not crash
            assert response.status_code in [200, 400, 422]

    def test_create_party_xss_in_fields(self, client, mock_supabase, mock_user, valid_party_data):
        """Should safely handle XSS attempts in party fields."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        xss_payloads = {
            "title": "<script>alert('xss')</script>",
            "host": "<img src=x onerror=alert(1)>",
            "address": "<svg onload=alert(1)>",
        }

        for field, payload in xss_payloads.items():
            valid_party_data[field] = payload[:30] if field == "host" else payload[:50]
            created_party = {
                **valid_party_data,
                "id": str(uuid.uuid4()),
                "latitude": 39.981,
                "longitude": -75.155,
                "going_count": 0,
                "status": "pending"
            }
            mock_supabase.table.return_value.insert.return_value.execute.return_value = \
                create_mock_db_response([created_party])

            response = client.post(
                "/parties",
                json=valid_party_data,
                headers={"Authorization": "Bearer valid_token"}
            )

            # Should store (will be escaped on output)
            assert response.status_code in [200, 400, 422]

    def test_create_party_invalid_coordinates(self, client, mock_supabase, mock_user, valid_party_data):
        """Should handle invalid coordinate values."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        # Only test JSON-serializable invalid coordinates
        # Note: float('inf') and float('nan') are not JSON-compliant and will
        # raise ValueError when serializing, so we skip those
        invalid_coords = [
            (999, 999),        # Out of range
            (-999, -999),      # Out of range
        ]

        for lat, lng in invalid_coords:
            valid_party_data["latitude"] = lat
            valid_party_data["longitude"] = lng

            response = client.post(
                "/parties",
                json=valid_party_data,
                headers={"Authorization": "Bearer valid_token"}
            )

            # Should handle gracefully
            assert response.status_code in [200, 400, 422]

    def test_create_party_extremely_long_address(self, client, mock_supabase, mock_user, valid_party_data):
        """Should handle extremely long address."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        valid_party_data["address"] = "A" * 10000

        created_party = {
            **valid_party_data,
            "id": str(uuid.uuid4()),
            "latitude": 39.981,
            "longitude": -75.155,
            "going_count": 0,
            "status": "pending"
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([created_party])

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        # Should either accept or reject with proper error
        assert response.status_code in [200, 400, 422]

    def test_create_party_unauthenticated(self, client, mock_supabase, valid_party_data):
        """Should reject unauthenticated party creation."""
        response = client.post("/parties", json=valid_party_data)

        assert response.status_code == 401

    def test_create_party_null_body(self, client, mock_supabase, mock_user):
        """Should handle null request body."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        response = client.post(
            "/parties",
            json=None,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 422

    def test_create_party_extra_fields_ignored(self, client, mock_supabase, mock_user, valid_party_data):
        """Should ignore extra/malicious fields in request."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        # Add fields that should be ignored
        valid_party_data["id"] = str(uuid.uuid4())  # Should not allow setting ID
        valid_party_data["going_count"] = 1000      # Should not allow inflating
        valid_party_data["status"] = "approved"      # Should not allow bypassing moderation
        valid_party_data["created_by"] = "other-user-id"  # Should not allow impersonation

        created_party = {
            **valid_party_data,
            "id": str(uuid.uuid4()),  # Different ID
            "latitude": 39.981,
            "longitude": -75.155,
            "going_count": 0,         # Should be 0
            "status": "pending"        # Should be pending
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([created_party])

        response = client.post(
            "/parties",
            json=valid_party_data,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        # These should be server-controlled, not client-controlled
        assert data["goingCount"] == 0
        assert data["status"] == "pending"


class TestDeleteParty:
    """Tests for DELETE /parties/{party_id} endpoint."""

    def test_delete_party_success(self, client, mock_supabase, mock_user, mock_party):
        """Should allow owner to delete their party."""
        mock_party["created_by"] = mock_user["id"]
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.delete(
            f"/parties/{mock_party['id']}",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

    def test_delete_party_not_owner(self, client, mock_supabase, mock_user, mock_party):
        """Should reject deletion by non-owner."""
        mock_party["created_by"] = str(uuid.uuid4())  # Different user
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        response = client.delete(
            f"/parties/{mock_party['id']}",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 403
        assert "own" in response.json()["detail"].lower()

    def test_delete_party_not_found(self, client, mock_supabase, mock_user):
        """Should return 404 for non-existent party."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        fake_id = str(uuid.uuid4())
        response = client.delete(
            f"/parties/{fake_id}",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 404

    def test_delete_party_unauthenticated(self, client, mock_supabase, mock_party):
        """Should reject unauthenticated deletion."""
        response = client.delete(f"/parties/{mock_party['id']}")

        assert response.status_code == 401

    def test_delete_party_sql_injection_in_id(self, client, mock_supabase, mock_user):
        """Should safely handle SQL injection in party ID."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        malicious_ids = [
            "'; DROP TABLE parties;--",
            "1' OR '1'='1",
        ]

        for mal_id in malicious_ids:
            response = client.delete(
                f"/parties/{mal_id}",
                headers={"Authorization": "Bearer valid_token"}
            )
            # Should return 404, not crash
            assert response.status_code in [404, 422]
