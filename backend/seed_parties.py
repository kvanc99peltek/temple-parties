"""
Seed script to populate parties in Supabase database.
Run with: python seed_parties.py
"""
import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import date, timedelta

load_dotenv()

# Supabase credentials from .env file
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")

print(f"Connecting to Supabase at: {SUPABASE_URL}")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def seed_parties():
    # This weekend: February 13-14, 2026
    # weekend_of uses Friday date (matches backend get_current_weekend)
    weekend = date(2026, 2, 6)  # Friday of this weekend
    print(f"Seeding parties for this weekend: {weekend}")

    saturday = weekend + timedelta(days=1)  # Saturday of launch weekend

    # Real party data for launch
    parties = [
        # Feb 6
        {
            "title": "Super Bowl Party",
            "host": "Pilam & Dchi",
            "pin_label": "PILAM",
            "category": "Frat Party",
            "day": "friday",
            "doors_open": "10:00 PM",
            "address": "1432 North Broad Street",
            "latitude": 39.97569,
            "longitude": -75.15898,
            "going_count": 48,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },

        {
            "title": "2016 Throwback Party",
            "host": "786 BOYz",
            "pin_label": "786",
            "category": "House Party",
            "day": "friday",
            "doors_open": "10:00 PM",
            "address": "1625 Cecil B Moore Ave",
            "latitude": 39.97949,
            "longitude": -75.16198,
            "going_count": 35,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },

        {
            "title": "2016 Throwback Party",
            "host": " ",
            "pin_label": "HOUSE",
            "category": "House Party",
            "day": "friday",
            "doors_open": "10:30 PM",
            "address": "1717 N 17th Street",
            "latitude": 39.98023,
            "longitude": -75.16240,
            "going_count": 23,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },

        {
            "title": "Party Like It's 2016",
            "host": "AEPI",
            "pin_label": "AEPI",
            "category": "Frat Party",
            "day": "saturday",
            "doors_open": "11:00 PM",
            "address": "1900 N 17th Street",
            "latitude": 39.98266,
            "longitude": -75.16219,
            "going_count": 31,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },

    ]
    
    # Clean up parties from the weekend that shouldn't be showing on prod
    print("Cleaning up parties from 2026-02-13...")
    supabase.table("parties").delete().eq("weekend_of", "2026-02-13").execute()

    # Clear existing parties for this weekend (optional - comment out if you want to keep existing)
    print("Clearing existing parties for this weekend...")
    supabase.table("parties").delete().eq("weekend_of", weekend.isoformat()).execute()

    # Insert new parties
    print(f"Inserting {len(parties)} parties...")
    result = supabase.table("parties").insert(parties).execute()

    print(f"Successfully inserted {len(result.data)} parties!")

    # Print inserted parties
    for party in result.data:
        print(f"  - {party['title']} ({party['day']}) - {party['going_count']} going")

    return result.data

if __name__ == "__main__":
    seed_parties()
