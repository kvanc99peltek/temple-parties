"""
Geocoding service using OpenStreetMap Nominatim API.
Converts street addresses to latitude/longitude coordinates.
"""
import httpx
import logging
import random
from app.constants import TEMPLE_BOUNDS

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "TemplePartiesApp/1.0"

# Wider bounds for validating geocoding results — accepts nearby neighborhoods
# (North Philly, Fairmount, etc.) but rejects totally wrong cities.
VALID_BOUNDS = {
    "min_lat": 39.94,
    "max_lat": 40.02,
    "min_lng": -75.20,
    "max_lng": -75.10,
}


def geocode_address(address: str) -> tuple[float, float] | None:
    """
    Geocode an address to (latitude, longitude) using Nominatim.

    Appends ", Philadelphia, PA" if not already present to improve accuracy
    for Temple University area addresses.

    Returns None if geocoding fails or the result is outside the valid area.
    """
    search_address = address
    if "philadelphia" not in address.lower() and "phila" not in address.lower():
        search_address = f"{address}, Philadelphia, PA"

    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                NOMINATIM_URL,
                params={
                    "q": search_address,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 0,
                },
                headers={"User-Agent": USER_AGENT},
            )
            response.raise_for_status()
            results = response.json()

        if not results:
            logger.warning(f"Nominatim returned no results for: {address}")
            return None

        lat = float(results[0]["lat"])
        lng = float(results[0]["lon"])

        if not (
            VALID_BOUNDS["min_lat"] <= lat <= VALID_BOUNDS["max_lat"]
            and VALID_BOUNDS["min_lng"] <= lng <= VALID_BOUNDS["max_lng"]
        ):
            logger.warning(
                f"Geocoded location ({lat}, {lng}) outside valid bounds for: {address}"
            )
            return None

        return round(lat, 8), round(lng, 8)

    except httpx.HTTPError as e:
        logger.error(f"Nominatim HTTP error for '{address}': {e}")
        return None
    except (KeyError, IndexError, ValueError) as e:
        logger.error(f"Error parsing Nominatim response for '{address}': {e}")
        return None


def generate_fallback_coordinates() -> tuple[float, float]:
    """Generate random coordinates within Temple area as a fallback."""
    lat = random.uniform(TEMPLE_BOUNDS["min_lat"], TEMPLE_BOUNDS["max_lat"])
    lng = random.uniform(TEMPLE_BOUNDS["min_lng"], TEMPLE_BOUNDS["max_lng"])
    return round(lat, 8), round(lng, 8)
