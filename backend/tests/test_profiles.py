"""Tests for GET/PATCH /profiles/me."""
from unittest.mock import MagicMock

from tests.conftest import create_mock_auth_response, create_mock_db_response


def _auth(mock_supabase, mock_user):
    mock_supabase.auth.get_user = MagicMock(
        return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
    )


def _profile_row(mock_user, **overrides):
    row = {
        "id": mock_user["id"],
        "email": mock_user["email"],
        "username": "testuser",
        "is_admin": False,
        "created_at": "2024-01-01T00:00:00",
        "school_year": None,
        "greek_life": None,
        "instagram": None,
        "avatar_url": None,
    }
    row.update(overrides)
    return row


class TestGetProfileMe:
    def test_get_me_existing_profile(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([_profile_row(mock_user)])

        response = client.get(
            "/profiles/me",
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == mock_user["email"]
        assert data["is_admin"] is False

    def test_get_me_creates_stub_when_missing(self, client, mock_supabase, mock_user):
        """3.4 — no FK trap if trigger missed; ensure_profile inserts a stub."""
        _auth(mock_supabase, mock_user)
        select_exec = MagicMock(return_value=create_mock_db_response([]))
        insert_exec = MagicMock(
            return_value=create_mock_db_response([_profile_row(mock_user, username=None)])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute = select_exec
        mock_supabase.table.return_value.insert.return_value.execute = insert_exec

        response = client.get(
            "/profiles/me",
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        assert response.json()["id"] == mock_user["id"]
        insert_exec.assert_called_once()

    def test_get_me_unauthenticated(self, client, mock_supabase):
        response = client.get("/profiles/me")
        assert response.status_code == 401


class TestPatchProfileMe:
    def test_patch_username(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)
        existing = _profile_row(mock_user, username=None)
        updated = _profile_row(mock_user, username="newname")

        # select for ensure_profile + username clash check; update at end
        select_chain = mock_supabase.table.return_value.select.return_value
        select_chain.eq.return_value.execute.return_value = create_mock_db_response([existing])
        select_chain.eq.return_value.neq.return_value.execute.return_value = create_mock_db_response([])
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([updated])

        response = client.patch(
            "/profiles/me",
            json={"username": "newname"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        assert response.json()["username"] == "newname"

    def test_patch_onboarding_fields(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)
        existing = _profile_row(mock_user)
        updated = _profile_row(
            mock_user,
            school_year="junior",
            greek_life="AEPi",
            instagram="temple_owl",
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([existing])
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([updated])

        response = client.patch(
            "/profiles/me",
            json={
                "school_year": "Junior",
                "greek_life": "AEPi",
                "instagram": "@temple_owl",
            },
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["school_year"] == "junior"
        assert data["instagram"] == "temple_owl"

    def test_patch_rejects_invalid_school_year(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)

        response = client.patch(
            "/profiles/me",
            json={"school_year": "alumni"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 400
        assert "school_year" in response.json()["detail"]

    def test_patch_rejects_bad_username(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)

        for username in ["a", "has space", "bad-name!", "x" * 40]:
            response = client.patch(
                "/profiles/me",
                json={"username": username},
                headers={"Authorization": "Bearer valid_token"},
            )
            assert response.status_code == 400, username

    def test_patch_username_conflict(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)
        existing = _profile_row(mock_user)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([existing])
        mock_supabase.table.return_value.select.return_value.eq.return_value.neq.return_value.execute.return_value = \
            create_mock_db_response([{"id": "other-user"}])

        response = client.patch(
            "/profiles/me",
            json={"username": "taken"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 409

    def test_patch_empty_body(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)

        response = client.patch(
            "/profiles/me",
            json={},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 400

    def test_patch_ignores_is_admin_escalation(self, client, mock_supabase, mock_user):
        """Extra fields like is_admin must not be applied."""
        _auth(mock_supabase, mock_user)
        existing = _profile_row(mock_user)
        updated = _profile_row(mock_user, username="safe")
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([existing])
        mock_supabase.table.return_value.select.return_value.eq.return_value.neq.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([updated])

        response = client.patch(
            "/profiles/me",
            json={"username": "safe", "is_admin": True},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        # Pydantic strips unknown fields; update payload must not include is_admin
        update_payload = mock_supabase.table.return_value.update.call_args[0][0]
        assert "is_admin" not in update_payload

    def test_retired_set_username_gone(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)
        response = client.post(
            "/auth/set-username",
            json={"username": "anyone"},
            headers={"Authorization": "Bearer valid_token"},
        )
        assert response.status_code == 404

    def test_retired_auth_me_gone(self, client, mock_supabase, mock_user):
        _auth(mock_supabase, mock_user)
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer valid_token"},
        )
        assert response.status_code == 404
