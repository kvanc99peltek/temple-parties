"""Tests for the shared slowapi key function.

Production traffic reaches Railway through the Vercel `/backend/*` proxy, so
the socket address is a proxy IP shared by everyone. client_ip_key must pull
the real caller out of X-Forwarded-For or every per-IP limit collapses into
one global bucket for the whole user base.
"""
from starlette.requests import Request

from app.rate_limit import client_ip_key


def _request(headers: dict | None = None, client=("10.9.9.9", 1234)) -> Request:
    """Build a minimal Starlette Request with the given headers."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [
            (k.lower().encode(), v.encode()) for k, v in (headers or {}).items()
        ],
        "client": client,
        "server": ("testserver", 80),
    }
    return Request(scope)


class TestClientIpKey:
    def test_uses_first_forwarded_hop(self):
        # First entry = the real browser; later entries are the proxies.
        req = _request({"X-Forwarded-For": "203.0.113.7, 76.76.21.21, 10.0.0.1"})
        assert client_ip_key(req) == "203.0.113.7"

    def test_single_forwarded_value(self):
        req = _request({"X-Forwarded-For": "203.0.113.7"})
        assert client_ip_key(req) == "203.0.113.7"

    def test_falls_back_to_socket_address_without_header(self):
        # Local dev hits uvicorn directly — no proxy header exists.
        req = _request()
        assert client_ip_key(req) == "10.9.9.9"

    def test_empty_header_falls_back_to_socket_address(self):
        req = _request({"X-Forwarded-For": ""})
        assert client_ip_key(req) == "10.9.9.9"

    def test_two_users_behind_proxy_get_distinct_keys(self):
        # The regression this module exists to prevent: everyone sharing one
        # bucket because the proxy IP was the key.
        a = client_ip_key(_request({"X-Forwarded-For": "203.0.113.7, 76.76.21.21"}))
        b = client_ip_key(_request({"X-Forwarded-For": "198.51.100.9, 76.76.21.21"}))
        assert a != b
