"""
Seed script to populate parties in Supabase database.
Run with: python seed_parties.py
"""
from supabase import create_client
from datetime import date, timedelta

# Supabase credentials
SUPABASE_URL = "https://gleiwfdgxqdvilodngzv.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZWl3ZmRneHFkdmlsb2RuZ3p2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODcxNTM3NCwiZXhwIjoyMDg0MjkxMzc0fQ.-G28ZrSm9AWDJ4HJMB_bFUeT0rqbQtZhQNEdsun0X80"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_current_weekend() -> date:
    """Get the Friday of the current or next weekend."""
    today = date.today()
    days_until_friday = (4 - today.weekday()) % 7
    if today.weekday() > 4:  # If Saturday or Sunday, use this weekend's Friday
        days_until_friday = (4 - today.weekday()) % 7 - 7
    return today + timedelta(days=days_until_friday)

def seed_parties():
    weekend = get_current_weekend()
    print(f"Seeding parties for weekend of: {weekend}")

    # Party data matching your app screenshot
    parties = [
        {
            "title": "Welcome Back Party",
            "host": "Alpha Beta Sigma Epilison",
            "category": "Frat Party",
            "day": "friday",
            "doors_open": "10 PM",
            "address": "1722 W Montgomery Avenue",
            "latitude": 39.9812,
            "longitude": -75.1565,
            "going_count": 67,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Just Another Band Show",
            "host": "Mountain Clouds",
            "category": "House Show",
            "day": "friday",
            "doors_open": "9 PM",
            "address": "1645 N 16th Street",
            "latitude": 39.9798,
            "longitude": -75.1589,
            "going_count": 53,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "2016 Party",
            "host": "Diddy",
            "category": "House Party",
            "day": "friday",
            "doors_open": "11 PM",
            "address": "789 W Diamond St",
            "latitude": 39.9825,
            "longitude": -75.1542,
            "going_count": 42,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Rooftop Vibes",
            "host": "Temple Student Org",
            "category": "Rooftop Party",
            "day": "saturday",
            "doors_open": "9 PM",
            "address": "1801 N Broad Street",
            "latitude": 39.9815,
            "longitude": -75.1527,
            "going_count": 45,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Late Night Kickback",
            "host": "The Crew",
            "category": "House Party",
            "day": "saturday",
            "doors_open": "11 PM",
            "address": "1534 W Cecil B Moore Ave",
            "latitude": 39.9795,
            "longitude": -75.1575,
            "going_count": 34,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Basement Beats",
            "host": "DJ Collective",
            "category": "Underground",
            "day": "saturday",
            "doors_open": "10 PM",
            "address": "1423 N 15th Street",
            "latitude": 39.9788,
            "longitude": -75.1601,
            "going_count": 38,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        }
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
