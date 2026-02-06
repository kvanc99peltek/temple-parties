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

def seed_parties():
    # This weekend: February 6-7, 2026
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
            "latitude": 39.9762,
            "longitude": -75.1527,
            "going_count": 12,
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
            "latitude": 39.9785,
            "longitude": -75.1565,
            "going_count": 7,
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
            "latitude": 39.95646,
            "longitude": -75.16687,
            "going_count": 7,
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
            "latitude": 39.9830,
            "longitude": -75.1593,
            "going_count": 8,
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
