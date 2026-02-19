"""
Seed script to populate parties in Supabase database.
Run with: python seed_parties.py
"""
from __future__ import annotations

import sys
import os
import argparse

# Add the backend directory to sys.path so we can import app.config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client
from datetime import date, timedelta
from app.config import get_settings

settings = get_settings()
supabase = create_client(settings.supabase_url, settings.supabase_service_key)

def get_next_friday():
    """Get the Friday of the current or next weekend."""
    today = date.today()
    days_until_friday = (4 - today.weekday()) % 7
    if days_until_friday == 0 and today.weekday() == 4:
        return today  # Today is Friday
    if today.weekday() > 4:  # Saturday or Sunday, use this weekend's Friday
        days_until_friday = (4 - today.weekday()) % 7 - 7
    return today + timedelta(days=days_until_friday)

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed approved parties into Supabase for a given weekend_of (Friday ISO date)."
    )
    parser.add_argument(
        "--weekend-of",
        dest="weekend_of",
        default=None,
        help="Friday date in YYYY-MM-DD. Defaults to computed next/current Friday.",
    )
    parser.add_argument(
        "--clear-seeded-only",
        action="store_true",
        help="Delete existing SEEDED parties for that weekend_of (created_by IS NULL) before inserting.",
    )
    parser.add_argument(
        "--clear-existing",
        action="store_true",
        help="Delete ALL existing parties for that weekend_of before inserting (destructive).",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Required to proceed when using --clear-existing.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would happen without writing anything.",
    )
    return parser.parse_args()


def seed_parties(*, weekend: date, clear_existing: bool, clear_seeded_only: bool, yes: bool, dry_run: bool):
    # weekend_of uses Friday date (matches backend get_current_weekend)
    print(f"Supabase URL: {settings.supabase_url}")
    print(f"Seeding approved parties for weekend_of: {weekend.isoformat()}")

    # Test party data
    parties = [
        {
            "title": "Valentine's Day Party",
            "host": "Delta Chi",
            "pin_label": "DCHI",
            "category": "Frat Party",
            "day": "friday",
            "doors_open": "10:00 PM",
            "address": "1432 North Broad Street",
            "latitude": 39.9762,
            "longitude": -75.1527,
            "going_count": 10,
            "is_verified": False,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
    ]

    if clear_existing:
        if not yes:
            raise SystemExit("Refusing to delete without --yes (use --clear-existing --yes).")
        print("Clearing existing parties for this weekend (ALL statuses)...")
        if not dry_run:
            supabase.table("parties").delete().eq("weekend_of", weekend.isoformat()).execute()
    elif clear_seeded_only:
        if not yes:
            raise SystemExit("Refusing to delete without --yes (use --clear-seeded-only --yes).")
        print("Clearing existing seeded parties for this weekend (created_by IS NULL)...")
        if not dry_run:
            supabase.table("parties").delete().eq("weekend_of", weekend.isoformat()).is_("created_by", "null").execute()
    else:
        print(
            "Note: existing parties will NOT be removed. Rerunning can create duplicates.\n"
            "Use --clear-seeded-only --yes (safer) or --clear-existing --yes (destructive) to replace."
        )

    # Insert new parties
    print(f"Inserting {len(parties)} parties...")
    if dry_run:
        print("Dry run: skipping insert.")
        result = type("Result", (), {"data": parties})  # lightweight stand-in
    else:
        result = supabase.table("parties").insert(parties).execute()

    print(f"Inserted {len(result.data)} parties.")

    # Print inserted parties
    for party in result.data:
        print(f"  - {party['title']} ({party['day']}) - {party['going_count']} going")

    return result.data

if __name__ == "__main__":
    args = _parse_args()
    if args.clear_existing and args.clear_seeded_only:
        raise SystemExit("Choose only one: --clear-existing or --clear-seeded-only.")
    weekend = date.fromisoformat(args.weekend_of) if args.weekend_of else get_next_friday()
    seed_parties(
        weekend=weekend,
        clear_existing=args.clear_existing,
        clear_seeded_only=args.clear_seeded_only,
        yes=args.yes,
        dry_run=args.dry_run,
    )
