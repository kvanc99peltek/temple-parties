"""Unit tests for geocoding helpers (no live Nominatim)."""
from app.services.geocoding import (
    format_us_address,
    geocode_address,
    match_temple_landmarks,
    suggest_addresses,
)


class TestFormatUsAddress:
    def test_street_address(self):
        label = format_us_address(
            {
                "house_number": "1705",
                "road": "West Montgomery Avenue",
                "city": "Philadelphia",
                "state": "Pennsylvania",
                "ISO3166-2-lvl4": "US-PA",
                "postcode": "19121",
            }
        )
        assert label == "1705 W Montgomery Avenue, Philadelphia, PA 19121"

    def test_keeps_building_name_for_landmarks(self):
        label = format_us_address(
            {
                "building": "Bell Tower",
                "road": "Lenfest Circle",
                "city": "Philadelphia",
                "ISO3166-2-lvl4": "US-PA",
                "postcode": "19122",
            },
            name="Bell Tower",
        )
        assert label.startswith("Bell Tower")
        assert "Lenfest Circle" in label
        assert "Philadelphia" in label
        assert "Lenfest Circle" != label.split(",")[0].strip()

    def test_amenity_name_without_house_number(self):
        label = format_us_address(
            {
                "amenity": "Howard Gittis Student Center",
                "road": "Liacouras Walk",
                "city": "Philadelphia",
                "ISO3166-2-lvl4": "US-PA",
            },
            name="Howard Gittis Student Center",
        )
        assert label.startswith("Howard Gittis Student Center")
        assert "Philadelphia" in label


class TestTempleLandmarks:
    def test_bell_tower_suggest(self):
        hits = match_temple_landmarks("bell tow")
        assert hits
        assert "Bell Tower" in hits[0]["display_name"]
        assert hits[0]["lat"] and hits[0]["lon"]

    def test_liacouras_alias(self):
        hits = match_temple_landmarks("liacouras")
        assert hits
        assert "Liacouras" in hits[0]["display_name"]

    def test_short_query_ignored(self):
        assert match_temple_landmarks("be") == []

    def test_geocode_bell_tower_without_nominatim(self):
        coords = geocode_address("Bell Tower")
        assert coords is not None
        lat, lng = coords
        assert 39.97 < lat < 39.99
        assert -75.16 < lng < -75.14

    def test_suggest_prepends_landmarks(self, monkeypatch):
        import httpx

        class _BoomClient:
            def __init__(self, *a, **k):
                pass

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def get(self, *a, **k):
                raise httpx.HTTPError("Nominatim down")

        monkeypatch.setattr("app.services.geocoding.httpx.Client", _BoomClient)
        hits = suggest_addresses("bell tower")
        assert hits
        assert "Bell Tower" in hits[0]["display_name"]
