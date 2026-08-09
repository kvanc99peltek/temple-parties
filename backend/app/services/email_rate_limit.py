"""Simple in-process per-email rate limiter for OTP paths.

Complements slowapi's per-IP limits. Limits are per-process (same caveat as
slowapi on multi-worker Railway) — good enough for OTP abuse damping.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock


class EmailRateLimiter:
    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, email: str) -> bool:
        key = email.strip().lower()
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            q = self._hits[key]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= self.max_calls:
                return False
            q.append(now)
            return True
