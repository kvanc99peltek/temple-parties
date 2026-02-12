"""
Seed script to populate parties in Supabase database.
Run with: python seed_parties.py
"""
import sys
import os

# Add the backend directory to sys.path so we can import app.config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client
from datetime import date
from app.config import get_settings

settings = get_settings()
supabase = create_client(settings.supabase_url, settings.supabase_service_key)

def seed_parties():
    # This weekend: February 6-7, 2026
    # weekend_of uses Friday date (matches backend get_current_weekend)
    weekend = date(2026, 2, 13)  # Friday of this weekend
    print(f"Seeding parties for this weekend: {weekend}")

    # Test party data
    parties = [
        {
            "title": "Super Bowl Party",
            "host": "Pilam & Dchi",
            "category": "Frat Party",
            "day": "friday",
            "doors_open": "10:00 PM",
            "address": "1432 North Broad Street",
            "latitude": 39.9762,
            "longitude": -75.1527,
            "going_count": 12,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "2016 Throwback Party",
            "host": "786 BOYz",
            "category": "House Party",
            "day": "friday",
            "doors_open": "10:00 PM",
            "address": "1625 Cecil B Moore Ave",
            "latitude": 39.9785,
            "longitude": -75.1565,
            "going_count": 7,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Neon Nights",
            "host": "TKE",
            "category": "Frat Party",
            "day": "friday",
            "doors_open": "10:30 PM",
            "address": "1717 N 17th Street",
            "latitude": 39.9565,
            "longitude": -75.1669,
            "going_count": 7,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Party Like It's 2016",
            "host": "AEPI",
            "category": "Frat Party",
            "day": "saturday",
            "doors_open": "11:00 PM",
            "address": "1900 N 17th Street",
            "latitude": 39.9830,
            "longitude": -75.1593,
            "going_count": 8,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Valentine's Pregame",
            "host": "Sigma Chi",
            "category": "Frat Party",
            "day": "saturday",
            "doors_open": "9:30 PM",
            "address": "1801 N Broad Street",
            "latitude": 39.9810,
            "longitude": -75.1530,
            "going_count": 15,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
    ]

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
