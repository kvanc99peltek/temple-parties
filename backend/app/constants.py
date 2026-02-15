# Allowed email domain for signup
ALLOWED_EMAIL_DOMAIN = "@temple.edu"

# Temple University area bounds for random coordinate generation
TEMPLE_BOUNDS = {
    "min_lat": 39.978,
    "max_lat": 39.985,
    "min_lng": -75.162,
    "max_lng": -75.148,
}

# Rate limit configurations
RATE_LIMITS = {
    "signup": "5/minute",
    "set_username": "10/minute",
    "create_party": "10/minute",
    "toggle_going_auth": "30/minute",
    "toggle_going_anon": "10/minute",
    "submit_rating": "10/minute",
}

# Valid day values
VALID_DAYS = ["friday", "saturday"]
