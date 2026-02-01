"""
Seed script to populate parties in Supabase database.
Run with: python seed_parties.py
"""
from supabase import create_client
from datetime import date, timedelta

# Supabase credentials
SUPABASE_URL = "https://gleiwfdgxqdvilodngzv.supabase.co"
SUPABASE_SERVICE_KEY = "your-service-key-here"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def seed_parties():
    # Launch day: January 30-31, 2026
    # weekend_of uses Friday date (matches backend get_current_weekend)
    weekend = date(2026, 1, 30)  # Friday of launch weekend
    print(f"Seeding parties for launch weekend: {weekend}")

    # Real party data for launch
    parties = [
        # Friday January 30
        {
            "title": "Blackout Party",
            "host": "OG Productions",
            "category": "House Party",
            "day": "friday",
            "doors_open": "10:45 PM",
            "address": "1732 N Sydenham Street",
            "latitude": 39.9795,
            "longitude": -75.1620,
            "going_count": 0,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        # Saturday January 31
        {
            "title": "Beta Theta Pi 2016 Party",
            "host": "Beta Theta Pi",
            "category": "Frat Party",
            "day": "saturday",
            "doors_open": "11:00 PM",
            "address": "1850 N 16th Street",
            "latitude": 39.9818,
            "longitude": -75.1589,
            "going_count": 0,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "2016 House Party",
            "host": "PILAM",
            "category": "House Party",
            "day": "friday",
            "doors_open": "10:30 PM",
            "address": "1438 North Broad Street",
            "latitude": 39.9765,
            "longitude": -75.1527,
            "going_count": 0,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Pi Kappa Phi 2016 Theme",
            "host": "Pi Kappa Phi",
            "category": "Frat Party",
            "day": "friday",
            "doors_open": "11:00 PM",
            "address": "1840 N 16th Street",
            "latitude": 39.9815,
            "longitude": -75.1589,
            "going_count": 0,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "80s & Aspen Party",
            "host": "DPhiE, Phi Sig & DZ",
            "category": "Day Party",
            "day": "saturday",
            "doors_open": "3:00 PM",
            "address": "1437 North 15th Street",
            "latitude": 39.9760,
            "longitude": -75.1605,
            "going_count": 0,
            "status": "approved",
            "weekend_of": weekend.isoformat()
        },
        {
            "title": "Alpha Sigma Phi – Back to 16 Party",
            "host": "Alpha Sigma Phi",
            "category": "Frat Party",
            "day": "saturday",
            "doors_open": "11:00 PM",
            "address": "1629 W Diamond Street",
            "latitude": 39.985276,
            "longitude": -75.160143,
            "going_count": 0,
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
