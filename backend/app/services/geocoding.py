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
USER_AGENT = "TemplePartiesApp/1.0 (https://tuparties.com; support@tuparties.com)"

# Wider bounds for validating geocoding results — accepts nearby neighborhoods
# (North Philly, Fairmount, etc.) but rejects totally wrong cities.
VALID_BOUNDS = {
    "min_lat": 39.94,
    "max_lat": 40.02,
    "min_lng": -75.20,
    "max_lng": -75.10,
}

# viewbox = left,top,right,bottom (Nominatim order)
_TEMPLE_VIEWBOX = (
    f"{VALID_BOUNDS['min_lng']},{VALID_BOUNDS['max_lat']},"
    f"{VALID_BOUNDS['max_lng']},{VALID_BOUNDS['min_lat']}"
)

_US_STATE_ABBREV = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
}

_ROAD_DIR_ABBREV = (
    ("Northwest", "NW"),
    ("Northeast", "NE"),
    ("Southwest", "SW"),
    ("Southeast", "SE"),
    ("North", "N"),
    ("South", "S"),
    ("East", "E"),
    ("West", "W"),
)


def _abbrev_road(road: str) -> str:
    """West Montgomery Avenue → W Montgomery Avenue (Google-ish)."""
    cleaned = road.strip()
    for full, short in _ROAD_DIR_ABBREV:
        if cleaned.startswith(full + " "):
            return f"{short} {cleaned[len(full) + 1:]}"
    return cleaned


def format_us_address(address: dict | None, fallback: str = "") -> str:
    """
    Build a Google-style label from Nominatim addressdetails.

    Example: 1705 W Montgomery Avenue, Philadelphia, PA 19121
    Skips neighbourhoods like Sharswood.
    """
    if not address:
        return fallback

    house = (address.get("house_number") or "").strip()
    road = _abbrev_road(address.get("road") or address.get("pedestrian") or "")
    street = f"{house} {road}".strip() if (house or road) else ""

    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("municipality")
        or ""
    ).strip()

    state_raw = (address.get("state") or "").strip()
    iso = (address.get("ISO3166-2-lvl4") or "").strip()  # e.g. US-PA
    if iso.startswith("US-") and len(iso) == 5:
        state = iso[3:]
    else:
        state = _US_STATE_ABBREV.get(state_raw.lower(), state_raw)

    postcode = (address.get("postcode") or "").strip()
    # Prefer 5-digit ZIP when Nominatim returns ZIP+4
    if len(postcode) > 5 and postcode[5] == "-":
        postcode = postcode[:5]

    city_line_parts: list[str] = []
    if city:
        city_line_parts.append(city)
    state_zip = " ".join(p for p in (state, postcode) if p)
    if state_zip:
        city_line_parts.append(state_zip)
    city_line = ", ".join(city_line_parts)

    if street and city_line:
        return f"{street}, {city_line}"
    return street or city_line or fallback


def _is_philadelphia(address: dict | None) -> bool:
    """True when Nominatim addressdetails resolve to Philadelphia, PA."""
    if not address:
        return False
    for key in ("city", "town", "municipality", "county"):
        val = (address.get(key) or "").strip().lower()
        if val in ("philadelphia", "philadelphia county"):
            return True
    return False


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


def suggest_addresses(query: str, *, limit: int = 5) -> list[dict]:
    """
    Return address autocomplete hits near Temple (server-side Nominatim).

    Browser calls to Nominatim get 403 (custom User-Agent is stripped on CORS),
    so the frontend must go through this proxy.
    """
    cleaned = (query or "").strip()
    if len(cleaned) < 3:
        return []

    search_query = cleaned
    if "philadelphia" not in cleaned.lower() and "phila" not in cleaned.lower():
        search_query = f"{cleaned}, Philadelphia, PA"

    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                NOMINATIM_URL,
                params={
                    "q": search_query,
                    "format": "json",
                    "limit": max(1, min(limit, 8)),
                    "addressdetails": 1,
                    "countrycodes": "us",
                    # Bias toward Temple without hard-excluding nearby Philly streets.
                    "viewbox": _TEMPLE_VIEWBOX,
                    "bounded": 0,
                },
                headers={"User-Agent": USER_AGENT},
            )
            response.raise_for_status()
            results = response.json()
    except httpx.HTTPError as e:
        logger.error(f"Nominatim suggest HTTP error for '{query}': {e}")
        return []
    except (TypeError, ValueError) as e:
        logger.error(f"Nominatim suggest parse error for '{query}': {e}")
        return []

    suggestions: list[dict] = []
    for row in results or []:
        addr = row.get("address") or {}
        if not _is_philadelphia(addr):
            continue
        try:
            lat = float(row["lat"])
            lng = float(row["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        if not (
            VALID_BOUNDS["min_lat"] <= lat <= VALID_BOUNDS["max_lat"]
            and VALID_BOUNDS["min_lng"] <= lng <= VALID_BOUNDS["max_lng"]
        ):
            continue
        raw_display = row.get("display_name") or ""
        label = format_us_address(addr, fallback=raw_display)
        if not label:
            continue
        suggestions.append(
            {
                "display_name": label,
                "lat": round(lat, 8),
                "lon": round(lng, 8),
            }
        )
    return suggestions


def generate_fallback_coordinates() -> tuple[float, float]:
    """Generate random coordinates within Temple area as a fallback."""
    lat = random.uniform(TEMPLE_BOUNDS["min_lat"], TEMPLE_BOUNDS["max_lat"])
    lng = random.uniform(TEMPLE_BOUNDS["min_lng"], TEMPLE_BOUNDS["max_lng"])
    return round(lat, 8), round(lng, 8)
