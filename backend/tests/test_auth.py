"""
Test cases for authentication endpoints.
Tests cover signup, magic link authentication, username setting, and profile retrieval.
Includes tests for malicious/invalid inputs that could break the system.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import uuid

from tests.conftest import create_mock_auth_response, create_mock_db_response


class TestSignup:
    """Tests for POST /auth/signup endpoint."""

    def test_signup_valid_temple_email(self, client, mock_supabase):
        """Should accept valid @temple.edu email addresses."""
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        response = client.post("/auth/signup", json={"email": "student@temple.edu"})

        assert response.status_code == 200
        assert response.json()["message"] == "Magic link sent to your email"

    def test_signup_valid_temple_email_uppercase(self, client, mock_supabase):
        """Should accept and normalize uppercase email addresses."""
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        response = client.post("/auth/signup", json={"email": "STUDENT@TEMPLE.EDU"})

        assert response.status_code == 200
        # Email should be lowercased before processing

    def test_signup_valid_temple_email_mixed_case(self, client, mock_supabase):
        """Should accept mixed case email addresses."""
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        response = client.post("/auth/signup", json={"email": "Student.Name@Temple.Edu"})

        assert response.status_code == 200

    def test_signup_non_temple_email_rejected(self, client, mock_supabase):
        """Should reject non-temple.edu email addresses."""
        response = client.post("/auth/signup", json={"email": "user@gmail.com"})

        assert response.status_code == 400
        assert "temple.edu" in response.json()["detail"].lower()

    def test_signup_similar_domain_rejected(self, client, mock_supabase):
        """Should reject domains that look similar to temple.edu."""
        test_emails = [
            "user@temple.edu.fake.com",  # Subdomain trick
            "user@fake-temple.edu",      # Hyphenated trick
            "user@templedu.com",         # Missing dot
            "user@temple-edu.com",       # Hyphen instead of dot
            "user@temple.education",     # Different TLD
            "user@templ.edu",            # Typosquatting
            "user@t3mple.edu",           # Homograph
        ]

        for email in test_emails:
            response = client.post("/auth/signup", json={"email": email})
            assert response.status_code == 400, f"Email {email} should be rejected"

    def test_signup_empty_email(self, client, mock_supabase):
        """Should reject empty email."""
        response = client.post("/auth/signup", json={"email": ""})

        assert response.status_code == 422  # Validation error

    def test_signup_null_email(self, client, mock_supabase):
        """Should reject null email."""
        response = client.post("/auth/signup", json={"email": None})

        assert response.status_code == 422

    def test_signup_invalid_email_format(self, client, mock_supabase):
        """Should reject malformed email addresses."""
        invalid_emails = [
            "not_an_email",
            "@temple.edu",
            "user@",
            "user@@temple.edu",
            "user @temple.edu",
            "user\n@temple.edu",
            "user<script>@temple.edu",
        ]

        for email in invalid_emails:
            response = client.post("/auth/signup", json={"email": email})
            assert response.status_code in [400, 422], f"Email {email} should be rejected"

    def test_signup_extremely_long_email(self, client, mock_supabase):
        """Should handle extremely long email addresses."""
        # Create a very long local part (before @)
        long_email = "a" * 500 + "@temple.edu"

        response = client.post("/auth/signup", json={"email": long_email})

        # Should either reject or handle gracefully
        assert response.status_code in [400, 422, 200]

    def test_signup_sql_injection_attempt(self, client, mock_supabase):
        """Should safely handle SQL injection attempts in email."""
        malicious_emails = [
            "user'; DROP TABLE users;--@temple.edu",
            "user' OR '1'='1@temple.edu",
            "user\"; DELETE FROM parties;--@temple.edu",
        ]

        for email in malicious_emails:
            response = client.post("/auth/signup", json={"email": email})
            # Should be rejected by email validation, not cause SQL error
            assert response.status_code in [400, 422]

    def test_signup_xss_attempt(self, client, mock_supabase):
        """Should safely handle XSS attempts in email."""
        malicious_emails = [
            "<script>alert('xss')</script>@temple.edu",
            "user@temple.edu<img src=x onerror=alert(1)>",
        ]

        for email in malicious_emails:
            response = client.post("/auth/signup", json={"email": email})
            assert response.status_code in [400, 422]

    def test_signup_unicode_email(self, client, mock_supabase):
        """Should handle unicode in email addresses."""
        unicode_emails = [
            "\u0000user@temple.edu",  # Null byte
            "user\u202e@temple.edu",  # Right-to-left override
            "usеr@temple.edu",        # Cyrillic 'e'
        ]

        for email in unicode_emails:
            response = client.post("/auth/signup", json={"email": email})
            # Should be handled safely
            assert response.status_code in [400, 422, 200]

    def test_signup_supabase_error_handled(self, client, mock_supabase):
        """Should handle Supabase errors gracefully."""
        mock_supabase.auth.sign_in_with_otp = MagicMock(
            side_effect=Exception("Supabase connection error")
        )

        response = client.post("/auth/signup", json={"email": "user@temple.edu"})

        assert response.status_code == 400

    def test_signup_missing_email_field(self, client, mock_supabase):
        """Should reject request without email field."""
        response = client.post("/auth/signup", json={})

        assert response.status_code == 422

    def test_signup_extra_fields_ignored(self, client, mock_supabase):
        """Should ignore extra fields in request body."""
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        response = client.post("/auth/signup", json={
            "email": "user@temple.edu",
            "is_admin": True,  # Malicious attempt to set admin
            "password": "secret",  # Should be ignored
        })

        assert response.status_code == 200


class TestSetUsername:
    """Tests for POST /auth/set-username endpoint."""

    def test_set_username_success_new_user(self, client, mock_supabase, mock_user):
        """Should successfully set username for new user."""
        # Mock auth
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        # Mock no existing profile
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        # Mock insert
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{"id": mock_user["id"], "username": "testuser"}])

        response = client.post(
            "/auth/set-username",
            json={"username": "testuser"},
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert response.json()["username"] == "testuser"

    def test_set_username_success_existing_user(self, client, mock_supabase, mock_user):
        """Should successfully update username for existing user."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        # Mock existing profile
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"id": mock_user["id"], "username": "oldname"}])
        # Mock update
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"id": mock_user["id"], "username": "newname"}])

        response = client.post(
            "/auth/set-username",
            json={"username": "newname"},
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200

    def test_set_username_too_short(self, client, mock_supabase, mock_user):
        """Should reject usernames shorter than 2 characters."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        response = client.post(
            "/auth/set-username",
            json={"username": "a"},
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400
        assert "2 characters" in response.json()["detail"]

    def test_set_username_empty(self, client, mock_supabase, mock_user):
        """Should reject empty username."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        response = client.post(
            "/auth/set-username",
            json={"username": ""},
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 400

    def test_set_username_whitespace_only(self, client, mock_supabase, mock_user):
        """Whitespace-only username should be rejected after trimming.

        The implementation trims whitespace before length check,
        so "   " (3 spaces) becomes "" which fails the >= 2 character requirement.
        """
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        response = client.post(
            "/auth/set-username",
            json={"username": "   "},
            headers={"Authorization": "Bearer valid_token"}
        )

        # Implementation trims whitespace, so this should be rejected
        assert response.status_code == 400
        assert "2 characters" in response.json()["detail"]

    def test_set_username_extremely_long(self, client, mock_supabase, mock_user):
        """Should reject extremely long usernames (max 50 characters)."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        long_username = "a" * 10000

        response = client.post(
            "/auth/set-username",
            json={"username": long_username},
            headers={"Authorization": "Bearer valid_token"}
        )

        # Should reject with proper error (max 50 characters)
        assert response.status_code == 400
        assert "50 characters" in response.json()["detail"]

    def test_set_username_sql_injection(self, client, mock_supabase, mock_user):
        """Should safely handle SQL injection in username."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{"id": mock_user["id"], "username": "test"}])

        malicious_names = [
            "user'; DROP TABLE users;--",
            "user' OR '1'='1",
            "Robert'); DROP TABLE parties;--",
        ]

        for name in malicious_names:
            response = client.post(
                "/auth/set-username",
                json={"username": name},
                headers={"Authorization": "Bearer valid_token"}
            )
            # Should not crash - either accept (parametrized queries) or reject
            assert response.status_code in [200, 400, 422]

    def test_set_username_xss_attempt(self, client, mock_supabase, mock_user):
        """Should safely handle XSS attempts in username."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{"id": mock_user["id"], "username": "test"}])

        xss_names = [
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert(1)>",
            "javascript:alert(1)",
            "<svg onload=alert(1)>",
        ]

        for name in xss_names:
            response = client.post(
                "/auth/set-username",
                json={"username": name},
                headers={"Authorization": "Bearer valid_token"}
            )
            # Should store safely (will be escaped on output)
            assert response.status_code in [200, 400, 422]

    def test_set_username_special_characters(self, client, mock_supabase, mock_user):
        """Should handle special characters in username."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{"id": mock_user["id"], "username": "test"}])

        special_names = [
            "user_name",
            "user-name",
            "user.name",
            "user123",
            "User Name",  # With space
            "user\tname",  # Tab
            "user\nname",  # Newline
        ]

        for name in special_names:
            response = client.post(
                "/auth/set-username",
                json={"username": name},
                headers={"Authorization": "Bearer valid_token"}
            )
            # Should handle gracefully
            assert response.status_code in [200, 400, 422]

    def test_set_username_unauthenticated(self, client, mock_supabase):
        """Should reject unauthenticated requests."""
        response = client.post(
            "/auth/set-username",
            json={"username": "testuser"}
        )

        assert response.status_code == 401

    def test_set_username_invalid_token(self, client, mock_supabase):
        """Should reject invalid tokens."""
        mock_supabase.auth.get_user = MagicMock(side_effect=Exception("Invalid token"))

        response = client.post(
            "/auth/set-username",
            json={"username": "testuser"},
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401

    def test_set_username_malformed_auth_header(self, client, mock_supabase):
        """Should handle malformed authorization headers."""
        malformed_headers = [
            {"Authorization": "invalid_format"},
            {"Authorization": "Bearer"},
            {"Authorization": "Basic token"},
            {"Authorization": ""},
        ]

        for headers in malformed_headers:
            response = client.post(
                "/auth/set-username",
                json={"username": "testuser"},
                headers=headers
            )
            assert response.status_code == 401


class TestGetMe:
    """Tests for GET /auth/me endpoint."""

    def test_get_me_success(self, client, mock_supabase, mock_user):
        """Should return user profile successfully."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{
                "id": mock_user["id"],
                "username": "testuser",
                "is_admin": False,
                "created_at": "2024-01-01T00:00:00"
            }])

        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["is_admin"] == False

    def test_get_me_user_not_in_profiles(self, client, mock_supabase, mock_user):
        """Should return null if user exists in auth but not in profiles."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code == 200
        assert response.json() is None

    def test_get_me_unauthenticated(self, client, mock_supabase):
        """Should reject unauthenticated requests."""
        response = client.get("/auth/me")

        assert response.status_code == 401

    def test_get_me_expired_token(self, client, mock_supabase):
        """Should reject expired tokens."""
        mock_supabase.auth.get_user = MagicMock(side_effect=Exception("Token expired"))

        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer expired_token"}
        )

        assert response.status_code == 401
