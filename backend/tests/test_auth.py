"""
Test cases for authentication endpoints (OTP request/verify) and auth helpers.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from supabase_auth.errors import AuthApiError

from tests.conftest import create_mock_auth_response, create_mock_db_response


class TestOtpRequest:
    """Tests for POST /auth/otp/request (and legacy /auth/signup alias)."""

    def test_otp_request_valid_temple_email(self, client, mock_supabase):
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        response = client.post("/auth/otp/request", json={"email": "student@temple.edu"})

        assert response.status_code == 200
        assert "code" in response.json()["message"].lower() or "sent" in response.json()["message"].lower()
        mock_supabase.auth.sign_in_with_otp.assert_called_once()

    def test_signup_alias_still_works(self, client, mock_supabase):
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        response = client.post("/auth/signup", json={"email": "student@temple.edu"})

        assert response.status_code == 200
        mock_supabase.auth.sign_in_with_otp.assert_called_once()

    def test_otp_request_normalizes_case(self, client, mock_supabase):
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        response = client.post("/auth/otp/request", json={"email": "STUDENT@TEMPLE.EDU"})

        assert response.status_code == 200
        call_args = mock_supabase.auth.sign_in_with_otp.call_args[0][0]
        assert call_args["email"] == "student@temple.edu"

    def test_otp_request_non_temple_email_rejected(self, client, mock_supabase):
        response = client.post("/auth/otp/request", json={"email": "user@gmail.com"})

        assert response.status_code == 400
        assert "temple.edu" in response.json()["detail"].lower()
        mock_supabase.auth.sign_in_with_otp.assert_not_called()

    def test_otp_request_similar_domain_rejected(self, client, mock_supabase):
        test_emails = [
            "user@temple.edu.fake.com",
            "user@fake-temple.edu",
            "user@templedu.com",
            "user@temple-edu.com",
            "user@temple.education",
            "user@templ.edu",
            "user@t3mple.edu",
        ]

        for email in test_emails:
            response = client.post("/auth/otp/request", json={"email": email})
            assert response.status_code == 400, f"Email {email} should be rejected"

    def test_otp_request_empty_email(self, client, mock_supabase):
        response = client.post("/auth/otp/request", json={"email": ""})
        assert response.status_code == 422

    def test_otp_request_invalid_email_format(self, client, mock_supabase):
        invalid_emails = [
            "not_an_email",
            "@temple.edu",
            "user@",
            "user@@temple.edu",
        ]
        for email in invalid_emails:
            response = client.post("/auth/otp/request", json={"email": email})
            assert response.status_code in [400, 422], f"Email {email} should be rejected"

    def test_otp_request_sql_injection_attempt(self, client, mock_supabase):
        malicious_emails = [
            "user'; DROP TABLE users;--@temple.edu",
            "user' OR '1'='1@temple.edu",
        ]
        for email in malicious_emails:
            response = client.post("/auth/otp/request", json={"email": email})
            assert response.status_code in [400, 422]

    def test_otp_request_supabase_error_handled(self, client, mock_supabase):
        mock_supabase.auth.sign_in_with_otp = MagicMock(
            side_effect=Exception("Supabase connection error")
        )

        response = client.post("/auth/otp/request", json={"email": "user@temple.edu"})

        assert response.status_code == 400

    def test_otp_request_extra_fields_ignored(self, client, mock_supabase):
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        response = client.post("/auth/otp/request", json={
            "email": "user@temple.edu",
            "is_admin": True,
            "password": "secret",
        })

        assert response.status_code == 200


class TestOtpVerify:
    """Tests for POST /auth/otp/verify."""

    def _session_response(self, user_id="u1", email="user@temple.edu"):
        session = Mock()
        session.access_token = "access_abc"
        session.refresh_token = "refresh_xyz"
        session.expires_in = 3600
        session.token_type = "bearer"
        user = Mock()
        user.id = user_id
        user.email = email
        response = Mock()
        response.session = session
        response.user = user
        return response

    def test_otp_verify_success(self, client, mock_supabase):
        mock_supabase.auth.verify_otp = MagicMock(return_value=self._session_response())

        response = client.post(
            "/auth/otp/verify",
            json={"email": "user@temple.edu", "code": "123456"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "access_abc"
        assert data["refresh_token"] == "refresh_xyz"
        assert data["user"]["email"] == "user@temple.edu"

    def test_otp_verify_rejects_non_temple(self, client, mock_supabase):
        response = client.post(
            "/auth/otp/verify",
            json={"email": "user@gmail.com", "code": "123456"},
        )
        assert response.status_code == 400
        mock_supabase.auth.verify_otp.assert_not_called()

    def test_otp_verify_rejects_bad_code_format(self, client, mock_supabase):
        for code in ["12345", "abcdef", "1234567", ""]:
            response = client.post(
                "/auth/otp/verify",
                json={"email": "user@temple.edu", "code": code},
            )
            assert response.status_code in [400, 422], f"code={code!r}"

    def test_otp_verify_invalid_code(self, client, mock_supabase):
        mock_supabase.auth.verify_otp = MagicMock(side_effect=Exception("Invalid"))

        response = client.post(
            "/auth/otp/verify",
            json={"email": "user@temple.edu", "code": "000000"},
        )

        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower() or "expired" in response.json()["detail"].lower()


class TestRequireAuth:
    """Auth matrix for JWT verification used by protected routes."""

    def test_require_auth_accepts_valid_token(self, client, mock_supabase, mock_user):
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{
                "id": mock_user["id"],
                "email": mock_user["email"],
                "username": None,
                "is_admin": False,
                "created_at": "2024-01-01T00:00:00",
                "school_year": None,
                "greek_life": None,
                "instagram": None,
                "avatar_url": None,
            }])

        response = client.get(
            "/profiles/me",
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        assert response.json()["id"] == mock_user["id"]

    def test_require_auth_rejects_missing_token(self, client, mock_supabase):
        response = client.get("/profiles/me")
        assert response.status_code == 401

    def test_require_auth_rejects_invalid_token(self, client, mock_supabase):
        # AuthApiError = Supabase looked at the token and said no → 401.
        mock_supabase.auth.get_user = MagicMock(
            side_effect=AuthApiError("Invalid token", 401, None)
        )

        with patch("app.routers.auth.logger.info") as mock_info:
            response = client.get(
                "/profiles/me",
                headers={"Authorization": "Bearer invalid_token"},
            )

        assert response.status_code == 401
        mock_info.assert_called_once()

    def test_require_auth_returns_503_when_auth_service_down(self, client, mock_supabase):
        # A network error means we never verified the token — that must be a
        # 503 ("retry me"), never a 401 that would sign a real user out.
        mock_supabase.auth.get_user = MagicMock(side_effect=ConnectionError("boom"))

        response = client.get(
            "/profiles/me",
            headers={"Authorization": "Bearer some_valid_token"},
        )

        assert response.status_code == 503

    def test_optional_auth_degrades_to_anonymous_when_auth_service_down(
        self, client, mock_supabase
    ):
        # Public reads keep working (soft-gated) even if token checks are down.
        mock_supabase.auth.get_user = MagicMock(side_effect=ConnectionError("boom"))
        mock_supabase.table.return_value.select.return_value.eq.return_value \
            .eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.get(
            "/parties",
            headers={"Authorization": "Bearer some_valid_token"},
        )

        assert response.status_code == 200
