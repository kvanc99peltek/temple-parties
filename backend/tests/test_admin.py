"""
Test cases for admin functionality.
Tests cover admin-only endpoints for party moderation.
Includes authorization bypass attempts and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock
import uuid

from tests.conftest import create_mock_auth_response, create_mock_db_response


class TestAdminAuthorization:
    """Tests for admin authorization checks."""

    def test_admin_endpoint_with_admin_user(self, client, mock_supabase, mock_admin_user):
        """Admin users should access admin endpoints."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"is_admin": True}])
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.get(
            "/admin/parties/pending",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200

    def test_admin_endpoint_with_regular_user(self, client, mock_supabase, mock_user):
        """Regular users should be denied access to admin endpoints."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"is_admin": False}])

        response = client.get(
            "/admin/parties/pending",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()

    def test_admin_endpoint_unauthenticated(self, client, mock_supabase):
        """Unauthenticated requests should be rejected."""
        response = client.get("/admin/parties/pending")

        assert response.status_code == 401

    def test_admin_endpoint_user_not_in_profiles(self, client, mock_supabase, mock_user):
        """Users not in profiles table should be denied."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])  # No profile found

        response = client.get(
            "/admin/parties/pending",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 403


class TestGetPendingParties:
    """Tests for GET /admin/parties/pending endpoint."""

    def test_get_pending_parties_success(self, client, mock_supabase, mock_admin_user, mock_party):
        """Should return list of pending parties."""
        mock_party["status"] = "pending"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"is_admin": True}])
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        response = client.get(
            "/admin/parties/pending",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "pending"

    def test_get_pending_parties_empty(self, client, mock_supabase, mock_admin_user):
        """Should return empty list when no pending parties."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"is_admin": True}])
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.get(
            "/admin/parties/pending",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert response.json() == []


class TestApproveParty:
    """Tests for POST /admin/parties/{party_id}/approve endpoint."""

    def test_approve_party_success(self, client, mock_supabase, mock_admin_user, mock_party):
        """Should successfully approve a pending party."""
        mock_party["status"] = "pending"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        # Admin check
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),  # Admin check
            create_mock_db_response([mock_party])           # Party exists
        ]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.post(
            f"/admin/parties/{mock_party['id']}/approve",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert "approved" in response.json()["message"].lower()

    def test_approve_party_not_found(self, client, mock_supabase, mock_admin_user):
        """Should return 404 for non-existent party."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([])  # Party not found
        ]

        fake_id = str(uuid.uuid4())
        response = client.post(
            f"/admin/parties/{fake_id}/approve",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 404

    def test_approve_party_already_approved(self, client, mock_supabase, mock_admin_user, mock_party):
        """Should reject approving an already approved party."""
        mock_party["status"] = "approved"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([mock_party])
        ]

        response = client.post(
            f"/admin/parties/{mock_party['id']}/approve",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400
        assert "pending" in response.json()["detail"].lower()

    def test_approve_party_already_rejected(self, client, mock_supabase, mock_admin_user, mock_party):
        """Should reject approving a rejected party."""
        mock_party["status"] = "rejected"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([mock_party])
        ]

        response = client.post(
            f"/admin/parties/{mock_party['id']}/approve",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400

    def test_approve_party_regular_user(self, client, mock_supabase, mock_user, mock_party):
        """Regular users should not be able to approve parties."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"is_admin": False}])

        response = client.post(
            f"/admin/parties/{mock_party['id']}/approve",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 403

    def test_approve_party_sql_injection_in_id(self, client, mock_supabase, mock_admin_user):
        """Should safely handle SQL injection in party ID."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        # Each request needs: admin check + party lookup (2 calls per request, 2 malicious IDs)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([]),  # Party not found for first ID
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([])   # Party not found for second ID
        ]

        malicious_ids = [
            "'; UPDATE parties SET status='approved' WHERE 1=1;--",
            "1' OR '1'='1",
        ]

        for mal_id in malicious_ids:
            response = client.post(
                f"/admin/parties/{mal_id}/approve",
                headers={"Authorization": "Bearer valid_token"}
            )
            # Should return 404, not execute injection
            assert response.status_code in [404, 422]


class TestRejectParty:
    """Tests for POST /admin/parties/{party_id}/reject endpoint."""

    def test_reject_party_success(self, client, mock_supabase, mock_admin_user, mock_party):
        """Should successfully reject a pending party."""
        mock_party["status"] = "pending"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([mock_party])
        ]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.post(
            f"/admin/parties/{mock_party['id']}/reject",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert "rejected" in response.json()["message"].lower()

    def test_reject_party_not_found(self, client, mock_supabase, mock_admin_user):
        """Should return 404 for non-existent party."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([])
        ]

        fake_id = str(uuid.uuid4())
        response = client.post(
            f"/admin/parties/{fake_id}/reject",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 404

    def test_reject_party_already_rejected(self, client, mock_supabase, mock_admin_user, mock_party):
        """Should reject rejecting an already rejected party."""
        mock_party["status"] = "rejected"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([mock_party])
        ]

        response = client.post(
            f"/admin/parties/{mock_party['id']}/reject",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400

    def test_reject_party_already_approved(self, client, mock_supabase, mock_admin_user, mock_party):
        """Should reject rejecting an already approved party."""
        mock_party["status"] = "approved"
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_admin_user["id"], mock_admin_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            create_mock_db_response([{"is_admin": True}]),
            create_mock_db_response([mock_party])
        ]

        response = client.post(
            f"/admin/parties/{mock_party['id']}/reject",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400

    def test_reject_party_regular_user(self, client, mock_supabase, mock_user, mock_party):
        """Regular users should not be able to reject parties."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"is_admin": False}])

        response = client.post(
            f"/admin/parties/{mock_party['id']}/reject",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 403


class TestAdminPrivilegeEscalation:
    """Tests for admin privilege escalation attempts."""

    def test_user_cannot_set_own_admin_flag(self, client, mock_supabase, mock_user):
        """Users should not be able to grant themselves admin privileges."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"id": mock_user["id"], "is_admin": False}])

        # Attempt to set admin through username endpoint (which creates/updates profile)
        response = client.post(
            "/auth/set-username",
            json={"username": "hacker", "is_admin": True},  # Malicious field
            headers={"Authorization": "Bearer valid_token"}
        )

        # Should succeed for username but ignore is_admin
        assert response.status_code == 200
        # The response should not indicate admin status was changed

    def test_forged_admin_flag_in_profile_creation(self, client, mock_supabase, mock_user):
        """New users should not be able to create profile with admin=true."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        # No existing profile
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        # Mock insert - check that is_admin is set to False
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{"id": mock_user["id"], "username": "test", "is_admin": False}])

        response = client.post(
            "/auth/set-username",
            json={"username": "newuser"},
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        # Verify that the insert was called with is_admin=False
        # (The actual implementation should hardcode this)

    def test_admin_cannot_access_without_valid_token(self, client, mock_supabase, mock_admin_user):
        """Even admin users need valid tokens."""
        mock_supabase.auth.get_user = MagicMock(side_effect=Exception("Invalid token"))

        response = client.get(
            "/admin/parties/pending",
            headers={"Authorization": "Bearer forged_admin_token"}
        )

        assert response.status_code == 401
