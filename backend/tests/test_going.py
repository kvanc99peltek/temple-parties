"""
Test cases for party attendance (going) functionality.
Tests cover toggling going status, retrieving user's going parties, and edge cases.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock
import uuid

from tests.conftest import create_mock_auth_response, create_mock_db_response


class TestToggleGoing:
    """Tests for POST /parties/{party_id}/going endpoint."""

    def test_toggle_going_mark_as_going(self, client, mock_supabase, mock_user, mock_party):
        """Should successfully mark user as going to a party."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        # Party exists
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])
        # User is not currently going
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        # Insert going record
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{"party_id": mock_party["id"], "user_id": mock_user["id"]}])
        # Update count
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.post(
            f"/parties/{mock_party['id']}/going",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["going"] == True
        assert data["goingCount"] == mock_party["going_count"] + 1

    def test_toggle_going_unmark_as_going(self, client, mock_supabase, mock_user, mock_party):
        """Should successfully remove user from going list."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        # Party exists
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])
        # User is currently going
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"party_id": mock_party["id"], "user_id": mock_user["id"]}])
        # Delete going record
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        # Update count
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.post(
            f"/parties/{mock_party['id']}/going",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["going"] == False
        assert data["goingCount"] == max(0, mock_party["going_count"] - 1)

    def test_toggle_going_party_not_found(self, client, mock_supabase, mock_user):
        """Should return 404 for non-existent party."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        fake_id = str(uuid.uuid4())
        response = client.post(
            f"/parties/{fake_id}/going",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 404

    def test_toggle_going_unauthenticated(self, client, mock_supabase, mock_party):
        """Should reject unauthenticated requests."""
        response = client.post(f"/parties/{mock_party['id']}/going")

        assert response.status_code == 401

    def test_toggle_going_count_never_negative(self, client, mock_supabase, mock_user, mock_party):
        """Going count should never go below 0."""
        mock_party["going_count"] = 0  # Already at 0
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])
        # User is going (edge case - count is 0 but user record exists)
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"party_id": mock_party["id"], "user_id": mock_user["id"]}])
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.post(
            f"/parties/{mock_party['id']}/going",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert response.json()["goingCount"] == 0  # Should not go negative

    def test_toggle_going_sql_injection_in_party_id(self, client, mock_supabase, mock_user):
        """Should safely handle SQL injection in party ID."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        malicious_ids = [
            "'; DROP TABLE party_going;--",
            "1'; UPDATE parties SET going_count=999999;--",
        ]

        for mal_id in malicious_ids:
            response = client.post(
                f"/parties/{mal_id}/going",
                headers={"Authorization": "Bearer valid_token"}
            )
            # Should return 404, not crash
            assert response.status_code in [404, 422]

    def test_toggle_going_rapid_toggling(self, client, mock_supabase, mock_user, mock_party):
        """Should handle rapid toggling without race conditions."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        # Simulate rapid toggling
        is_going = False
        for i in range(5):
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
                create_mock_db_response([mock_party])

            if is_going:
                mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([{"party_id": mock_party["id"], "user_id": mock_user["id"]}])
                mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([])
            else:
                mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
                    create_mock_db_response([])
                mock_supabase.table.return_value.insert.return_value.execute.return_value = \
                    create_mock_db_response([])

            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
                create_mock_db_response([])

            response = client.post(
                f"/parties/{mock_party['id']}/going",
                headers={"Authorization": "Bearer valid_token"}
            )

            assert response.status_code == 200
            is_going = response.json()["going"]


class TestGetUserGoingParties:
    """Tests for GET /parties/user/going endpoint."""

    def test_get_user_going_parties_success(self, client, mock_supabase, mock_user):
        """Should return list of party IDs user is going to."""
        party_ids = [str(uuid.uuid4()), str(uuid.uuid4())]
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([
                {"party_id": party_ids[0]},
                {"party_id": party_ids[1]}
            ])

        response = client.get(
            "/parties/user/going",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert set(data) == set(party_ids)

    def test_get_user_going_parties_empty(self, client, mock_supabase, mock_user):
        """Should return empty list when user is not going to any parties."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.get(
            "/parties/user/going",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_get_user_going_parties_unauthenticated(self, client, mock_supabase):
        """Should reject unauthenticated requests."""
        response = client.get("/parties/user/going")

        assert response.status_code == 401

    def test_get_user_going_parties_invalid_token(self, client, mock_supabase):
        """Should reject invalid tokens."""
        mock_supabase.auth.get_user = MagicMock(side_effect=Exception("Invalid token"))

        response = client.get(
            "/parties/user/going",
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401

    def test_get_user_going_parties_many_parties(self, client, mock_supabase, mock_user):
        """Should handle user going to many parties."""
        party_ids = [str(uuid.uuid4()) for _ in range(100)]
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"party_id": pid} for pid in party_ids])

        response = client.get(
            "/parties/user/going",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert len(response.json()) == 100
