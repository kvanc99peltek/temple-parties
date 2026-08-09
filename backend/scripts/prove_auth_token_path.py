#!/usr/bin/env python3
"""
Epic 3.3 — Prove the auth token path end-to-end against tuparties-dev.

Flow:
  1. Admin generateLink → obtain email OTP for a @temple.edu test user
  2. POST /auth/otp/verify → session JWT
  3. GET /profiles/me with Bearer JWT → FastAPI require_auth accepts it
  4. Confirm user_profiles row exists (trigger / ensure_profile)
  5. Cleanup test user

Usage (from backend/ with venv + .env pointing at DEV):
  python scripts/prove_auth_token_path.py
  python scripts/prove_auth_token_path.py --api-url http://localhost:8000
"""
from __future__ import annotations

import argparse
import sys
import uuid
from pathlib import Path

import httpx

# Allow `python scripts/...` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.database import supabase  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8000",
        help="FastAPI base URL (default: local uvicorn)",
    )
    args = parser.parse_args()

    settings = get_settings()
    print(f"Supabase URL: {settings.supabase_url}")
    print(f"API URL:      {args.api_url}")

    email = f"epic3-proof-{uuid.uuid4().hex[:10]}@temple.edu"
    print(f"Test email:   {email}")

    # 1) Generate OTP via admin API (no inbox needed)
    link = supabase.auth.admin.generate_link(
        {"type": "magiclink", "email": email}
    )
    props = getattr(link, "properties", None) or {}
    if hasattr(props, "email_otp"):
        otp = props.email_otp
        user_id = getattr(getattr(link, "user", None), "id", None)
    elif isinstance(props, dict):
        otp = props.get("email_otp")
        user_id = (getattr(link, "user", None) or {}).get("id") if isinstance(getattr(link, "user", None), dict) else getattr(getattr(link, "user", None), "id", None)
    else:
        # supabase-py may return a model — poke common attrs
        otp = getattr(props, "email_otp", None)
        user_id = getattr(getattr(link, "user", None), "id", None)

    if not otp:
        # Fallback: inspect raw dict-like
        raw = link.model_dump() if hasattr(link, "model_dump") else link.__dict__
        print("generate_link response keys:", raw)
        props_raw = raw.get("properties") or {}
        otp = props_raw.get("email_otp") if isinstance(props_raw, dict) else None
        user = raw.get("user") or {}
        user_id = user.get("id") if isinstance(user, dict) else user_id

    if not otp:
        print("FAIL: could not extract email_otp from admin.generate_link")
        return 1

    print(f"OTP obtained via admin.generate_link (len={len(otp)})")

    exit_code = 1
    try:
        # 2) Verify through our backend (domain + rate-limit path)
        with httpx.Client(base_url=args.api_url, timeout=30.0) as client:
            verify = client.post(
                "/auth/otp/verify",
                json={"email": email, "code": otp},
            )
            print(f"POST /auth/otp/verify → {verify.status_code}")
            if verify.status_code != 200:
                print(verify.text)
                return 1

            session = verify.json()
            token = session["access_token"]
            print("Session JWT received")

            # 3) require_auth accepts it
            me = client.get(
                "/profiles/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            print(f"GET /profiles/me → {me.status_code}")
            if me.status_code != 200:
                print(me.text)
                return 1

            profile = me.json()
            print(f"Profile id={profile.get('id')} email={profile.get('email')}")
            if profile.get("email", "").lower() != email:
                print("FAIL: profile email mismatch")
                return 1
            if not user_id:
                user_id = profile.get("id")

            # Domain rejection smoke
            bad = client.post(
                "/auth/otp/request",
                json={"email": "not-temple@gmail.com"},
            )
            print(f"POST /auth/otp/request (gmail) → {bad.status_code}")
            if bad.status_code != 400:
                print("FAIL: expected 400 for non-temple email")
                return 1

        print("PASS: token path proven end-to-end")
        exit_code = 0
        return 0
    finally:
        # 5) Cleanup
        uid = user_id or profile_id_from_db(email)
        if uid:
            try:
                supabase.auth.admin.delete_user(uid)
                print(f"Cleaned up auth user {uid}")
            except Exception as e:
                print(f"Cleanup warning: {e}")
        if exit_code != 0 and "exit_code" in dir():
            pass


def profile_id_from_db(email: str):
    try:
        res = (
            supabase.table("user_profiles")
            .select("id")
            .eq("email", email)
            .execute()
        )
        if res.data:
            return res.data[0]["id"]
    except Exception:
        return None
    return None


if __name__ == "__main__":
    raise SystemExit(main())
