"""Shared slowapi key function: rate-limit by the real end-user IP.

Browsers reach this API through the Vercel `/backend/*` rewrite (and Railway's
own edge proxy), so the TCP peer address the server sees is a proxy IP shared
by every visitor at once. Keying slowapi on that address quietly turned every
"per-IP" limit into ONE global bucket for the whole user base — twenty profile
saves per minute TOTAL, not per student.

Proxies record the original caller in the X-Forwarded-For header, appending
their own address as the request passes through, so the first entry is the
real client. A client could technically forge that header to dodge limits,
but that only returns us to per-key limiting — strictly better than the
shared-bucket failure mode this fixes.
"""
from fastapi import Request
from slowapi.util import get_remote_address


def client_ip_key(request: Request) -> str:
    """slowapi key_func: first X-Forwarded-For hop, else the socket address."""
    forwarded = request.headers.get("x-forwarded-for", "")
    first = forwarded.split(",")[0].strip()
    if first:
        return first
    # No proxy header (e.g. local dev hitting uvicorn directly) — the socket
    # address really is the client.
    return get_remote_address(request)
