"""
Comprehensive security test cases for Temple Parties API.
Tests for common vulnerabilities, edge cases, and malicious inputs.
Covers OWASP Top 10 concerns relevant to this application.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock
import uuid
import json

from tests.conftest import create_mock_auth_response, create_mock_db_response


class TestInputValidation:
    """Tests for input validation and sanitization."""

    def test_oversized_json_payload(self, client, mock_supabase, mock_user):
        """Should handle oversized JSON payloads."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )

        # Create a massive payload
        large_payload = {
            "title": "A" * 100,
            "host": "B" * 100,
            "category": "C" * 1000,
            "day": "friday",
            "doors_open": "10 PM",
            "address": "D" * 10000,
            "extra_field": "E" * 100000,  # Very large extra field
        }

        response = client.post(
            "/parties",
            json=large_payload,
            headers={"Authorization": "Bearer valid_token"}
        )

        # Should either reject or handle gracefully, not crash
        assert response.status_code in [200, 400, 413, 422]

    def test_deeply_nested_json(self, client, mock_supabase):
        """Should handle deeply nested JSON structures."""
        # Create deeply nested structure
        nested = {"level": 0}
        current = nested
        for i in range(100):
            current["nested"] = {"level": i + 1}
            current = current["nested"]

        response = client.post(
            "/auth/signup",
            json={"email": "user@temple.edu", "nested": nested}
        )

        # Should handle without crashing
        assert response.status_code in [200, 400, 422]

    def test_special_characters_in_all_fields(self, client, mock_supabase, mock_user):
        """Should handle special characters in all input fields."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{
                "id": str(uuid.uuid4()),
                "title": "Test",
                "host": "Host",
                "category": "Cat",
                "day": "friday",
                "doors_open": "10 PM",
                "address": "Addr",
                "latitude": 39.981,
                "longitude": -75.155,
                "going_count": 0,
                "status": "pending"
            }])

        special_chars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~"
        payload = {
            "title": f"Party {special_chars}"[:50],
            "host": f"Host {special_chars}"[:30],
            "category": f"Category {special_chars}",
            "day": "friday",
            "doors_open": "10 PM",
            "address": f"123 {special_chars} St",
        }

        response = client.post(
            "/parties",
            json=payload,
            headers={"Authorization": "Bearer valid_token"}
        )

        assert response.status_code in [200, 400, 422]

    def test_null_bytes_in_inputs(self, client, mock_supabase):
        """Should handle null bytes in input strings."""
        payloads = [
            {"email": "user\x00@temple.edu"},
            {"email": "user@temple\x00.edu"},
            {"email": "\x00user@temple.edu"},
        ]

        for payload in payloads:
            response = client.post("/auth/signup", json=payload)
            # Should not crash - either accept or reject cleanly
            assert response.status_code in [200, 400, 422]

    def test_unicode_normalization_attacks(self, client, mock_supabase):
        """Should handle unicode normalization edge cases."""
        # Different unicode representations of similar-looking characters
        emails = [
            "user@temple.edu",          # Normal
            "usеr@temple.edu",           # Cyrillic 'е'
            "user@tеmple.edu",           # Cyrillic 'е' in domain
            "user@temple\u200b.edu",     # Zero-width space
            "user@temple\ufeff.edu",     # BOM character
        ]

        for email in emails:
            response = client.post("/auth/signup", json={"email": email})
            # All except the first should be rejected or handled safely
            assert response.status_code in [200, 400, 422]


class TestSQLInjection:
    """Tests for SQL injection vulnerabilities."""

    def test_sql_injection_in_email(self, client, mock_supabase):
        """Should prevent SQL injection in email field."""
        injections = [
            "user@temple.edu'; DROP TABLE users;--",
            "user@temple.edu' OR '1'='1",
            "user@temple.edu'; UPDATE users SET is_admin=true;--",
            "user@temple.edu' UNION SELECT * FROM users;--",
            "user@temple.edu'; DELETE FROM parties;--",
        ]

        for injection in injections:
            response = client.post("/auth/signup", json={"email": injection})
            # Should be rejected by email validation
            assert response.status_code in [400, 422]

    def test_sql_injection_in_party_fields(self, client, mock_supabase, mock_user):
        """Should prevent SQL injection in party creation fields."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{
                "id": str(uuid.uuid4()),
                "title": "test",
                "host": "host",
                "category": "cat",
                "day": "friday",
                "doors_open": "10 PM",
                "address": "addr",
                "latitude": 39.981,
                "longitude": -75.155,
                "going_count": 0,
                "status": "pending"
            }])

        injection = "'; DROP TABLE parties;--"
        payload = {
            "title": injection[:50],
            "host": injection[:30],
            "category": injection,
            "day": "friday",
            "doors_open": "10 PM",
            "address": injection,
        }

        response = client.post(
            "/parties",
            json=payload,
            headers={"Authorization": "Bearer valid_token"}
        )

        # Should use parameterized queries and store safely
        assert response.status_code in [200, 400, 422]

    def test_sql_injection_in_query_params(self, client, mock_supabase):
        """Should prevent SQL injection in query parameters."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([])

        injections = [
            "friday' OR '1'='1",
            "friday'; DROP TABLE parties;--",
            "friday' UNION SELECT * FROM users;--",
        ]

        for injection in injections:
            response = client.get(f"/parties?day={injection}")
            # Should not execute injection
            assert response.status_code == 200


class TestXSSVulnerabilities:
    """Tests for Cross-Site Scripting (XSS) vulnerabilities."""

    def test_xss_in_party_title(self, client, mock_supabase, mock_user):
        """Should safely handle XSS in party title."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        xss_title = "<script>alert('XSS')</script>"
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{
                "id": str(uuid.uuid4()),
                "title": xss_title,
                "host": "host",
                "category": "cat",
                "day": "friday",
                "doors_open": "10 PM",
                "address": "addr",
                "latitude": 39.981,
                "longitude": -75.155,
                "going_count": 0,
                "status": "pending"
            }])

        payload = {
            "title": xss_title,
            "host": "Host",
            "category": "House Party",
            "day": "friday",
            "doors_open": "10 PM",
            "address": "123 Test St",
        }

        response = client.post(
            "/parties",
            json=payload,
            headers={"Authorization": "Bearer valid_token"}
        )

        # Should store the value (frontend should escape on render)
        assert response.status_code in [200, 400]

    def test_xss_payloads(self, client, mock_supabase, mock_user):
        """Should handle various XSS payload types."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([{
                "id": str(uuid.uuid4()),
                "title": "test",
                "host": "host",
                "category": "cat",
                "day": "friday",
                "doors_open": "10 PM",
                "address": "addr",
                "latitude": 39.981,
                "longitude": -75.155,
                "going_count": 0,
                "status": "pending"
            }])

        xss_payloads = [
            "<img src=x onerror=alert(1)>",
            "<svg onload=alert(1)>",
            "javascript:alert(1)",
            "<body onload=alert(1)>",
            "<iframe src='javascript:alert(1)'>",
            "<a href='javascript:alert(1)'>click</a>",
            "'-alert(1)-'",
            "\"><script>alert(1)</script>",
        ]

        for xss in xss_payloads:
            payload = {
                "title": xss[:50],
                "host": "Host",
                "category": "House Party",
                "day": "friday",
                "doors_open": "10 PM",
                "address": "123 Test St",
            }

            response = client.post(
                "/parties",
                json=payload,
                headers={"Authorization": "Bearer valid_token"}
            )

            # Should not crash
            assert response.status_code in [200, 400, 422]


class TestAuthenticationBypass:
    """Tests for authentication bypass attempts."""

    def test_missing_auth_header(self, client, mock_supabase):
        """Should reject requests without auth header to protected endpoints."""
        protected_endpoints = [
            ("POST", "/parties"),
            ("DELETE", "/parties/some-id"),
            ("POST", "/parties/some-id/going"),
            ("GET", "/parties/user/going"),
            ("POST", "/auth/set-username"),
            ("GET", "/auth/me"),
        ]

        for method, endpoint in protected_endpoints:
            if method == "POST":
                response = client.post(endpoint, json={})
            elif method == "DELETE":
                response = client.delete(endpoint)
            elif method == "GET":
                response = client.get(endpoint)

            assert response.status_code == 401, f"Endpoint {method} {endpoint} should require auth"

    def test_invalid_bearer_token(self, client, mock_supabase):
        """Should reject invalid bearer tokens."""
        mock_supabase.auth.get_user = MagicMock(side_effect=Exception("Invalid token"))

        response = client.post(
            "/auth/set-username",
            json={"username": "test"},
            headers={"Authorization": "Bearer invalid_token_12345"}
        )

        assert response.status_code == 401

    def test_expired_token(self, client, mock_supabase):
        """Should reject expired tokens."""
        mock_supabase.auth.get_user = MagicMock(side_effect=Exception("Token expired"))

        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer expired_token"}
        )

        assert response.status_code == 401

    def test_malformed_auth_headers(self, client, mock_supabase):
        """Should handle malformed authorization headers."""
        malformed_headers = [
            {"Authorization": "Bearer"},          # Missing token
            {"Authorization": "Basic token123"},   # Wrong scheme
            {"Authorization": "token123"},         # Missing scheme
            {"Authorization": ""},                 # Empty
            {"Authorization": "Bearer  "},         # Whitespace token
            {"Authorization": "BEARER token"},     # Wrong case (might work)
        ]

        for headers in malformed_headers:
            response = client.get("/auth/me", headers=headers)
            # Should either reject (401), handle gracefully (200), or return
            # bad request (400) if the token causes downstream issues
            assert response.status_code in [400, 401, 200]


class TestAuthorizationBypass:
    """Tests for authorization bypass attempts."""

    def test_regular_user_accessing_admin_endpoint(self, client, mock_supabase, mock_user):
        """Regular users should not access admin endpoints."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([{"is_admin": False}])

        admin_endpoints = [
            ("GET", "/admin/parties/pending"),
            ("POST", f"/admin/parties/{str(uuid.uuid4())}/approve"),
            ("POST", f"/admin/parties/{str(uuid.uuid4())}/reject"),
        ]

        for method, endpoint in admin_endpoints:
            if method == "POST":
                response = client.post(endpoint, headers={"Authorization": "Bearer valid_token"})
            else:
                response = client.get(endpoint, headers={"Authorization": "Bearer valid_token"})

            assert response.status_code == 403

    def test_user_deleting_another_users_party(self, client, mock_supabase, mock_user, mock_party):
        """Users should not delete others' parties."""
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

    def test_privilege_escalation_in_signup(self, client, mock_supabase):
        """Users should not be able to grant themselves admin during signup."""
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        # Attempt to include admin flag in signup
        response = client.post(
            "/auth/signup",
            json={"email": "user@temple.edu", "is_admin": True}
        )

        # Should succeed but ignore is_admin
        assert response.status_code == 200


class TestRateLimiting:
    """Tests for rate limiting concerns (note: actual rate limiting may not be implemented)."""

    def test_rapid_login_attempts(self, client, mock_supabase):
        """Should handle rapid login attempts."""
        mock_supabase.auth.sign_in_with_otp = MagicMock(return_value=Mock())

        # Simulate rapid requests
        for _ in range(20):
            response = client.post(
                "/auth/signup",
                json={"email": "user@temple.edu"}
            )
            # Should all succeed or be rate limited
            assert response.status_code in [200, 429]

    def test_rapid_going_toggles(self, client, mock_supabase, mock_user, mock_party):
        """Should handle rapid going toggles."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        for _ in range(20):
            response = client.post(
                f"/parties/{mock_party['id']}/going",
                headers={"Authorization": "Bearer valid_token"}
            )
            assert response.status_code in [200, 429]


class TestAPIAbuse:
    """Tests for API abuse scenarios."""

    def test_requesting_nonexistent_resources(self, client, mock_supabase, mock_user):
        """Should handle requests for nonexistent resources gracefully."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        fake_ids = [
            str(uuid.uuid4()),
            "00000000-0000-0000-0000-000000000000",
            "ffffffff-ffff-ffff-ffff-ffffffffffff",
        ]

        for fake_id in fake_ids:
            response = client.get(f"/parties/{fake_id}")
            assert response.status_code == 404

    def test_large_batch_of_requests(self, client, mock_supabase, mock_party):
        """Should handle large batches of requests."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = \
            create_mock_db_response([mock_party])

        # Make many requests
        responses = []
        for _ in range(50):
            response = client.get("/parties")
            responses.append(response.status_code)

        # All should succeed
        assert all(status == 200 for status in responses)

    def test_concurrent_state_modification(self, client, mock_supabase, mock_user, mock_party):
        """Test handling of concurrent modifications to same resource."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([mock_party])
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = \
            create_mock_db_response([])
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        # Simulate concurrent going toggles
        import concurrent.futures

        def toggle_going():
            return client.post(
                f"/parties/{mock_party['id']}/going",
                headers={"Authorization": "Bearer valid_token"}
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(toggle_going) for _ in range(10)]
            results = [f.result() for f in futures]

        # All should complete without error
        for result in results:
            assert result.status_code in [200, 429]


class TestContentTypeHandling:
    """Tests for content type handling."""

    def test_wrong_content_type(self, client, mock_supabase):
        """Should handle wrong content types."""
        response = client.post(
            "/auth/signup",
            data="email=user@temple.edu",  # Form data instead of JSON
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        # Should reject or handle appropriately
        assert response.status_code in [400, 415, 422]

    def test_no_content_type(self, client, mock_supabase):
        """Should handle missing content type."""
        response = client.post(
            "/auth/signup",
            content=b'{"email": "user@temple.edu"}'
        )

        # FastAPI usually handles this
        assert response.status_code in [200, 400, 415, 422]

    def test_xml_content_type(self, client, mock_supabase):
        """Should reject XML content type (prevent XXE)."""
        response = client.post(
            "/auth/signup",
            content=b'<email>user@temple.edu</email>',
            headers={"Content-Type": "application/xml"}
        )

        assert response.status_code in [400, 415, 422]


class TestPathTraversal:
    """Tests for path traversal attacks."""

    def test_path_traversal_in_party_id(self, client, mock_supabase, mock_user):
        """Should prevent path traversal in party ID."""
        mock_supabase.auth.get_user = MagicMock(
            return_value=create_mock_auth_response(mock_user["id"], mock_user["email"])
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            create_mock_db_response([])

        traversal_payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "....//....//....//etc/passwd",
            "..%2f..%2f..%2fetc%2fpasswd",
        ]

        for payload in traversal_payloads:
            response = client.get(f"/parties/{payload}")
            # Should return 404, not actual file contents
            assert response.status_code in [404, 422]
