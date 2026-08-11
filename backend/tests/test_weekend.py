"""
Tests for the authoritative weekend service (US/Eastern).
"""
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

import pytest

from app.services import weekend as weekend_service

EASTERN = ZoneInfo("America/New_York")


class TestGetCurrentWeekend:
    """Day-boundary matrix for get_current_weekend."""

    @pytest.mark.parametrize(
        "today,expected",
        [
            # Tuesday Aug 5, 2025 → upcoming Friday Aug 8
            (date(2025, 8, 5), date(2025, 8, 8)),
            # Wednesday
            (date(2025, 8, 6), date(2025, 8, 8)),
            # Thursday
            (date(2025, 8, 7), date(2025, 8, 8)),
            # Friday → today
            (date(2025, 8, 8), date(2025, 8, 8)),
            # Saturday → past Friday
            (date(2025, 8, 9), date(2025, 8, 8)),
            # Sunday → past Friday
            (date(2025, 8, 10), date(2025, 8, 8)),
            # Monday → past Friday (rollover at Tuesday)
            (date(2025, 8, 11), date(2025, 8, 8)),
            # Next Tuesday → upcoming Friday Aug 15
            (date(2025, 8, 12), date(2025, 8, 15)),
        ],
    )
    def test_weekend_matrix(self, today, expected):
        assert weekend_service.get_current_weekend(today) == expected

    def test_monday_case_explicit(self):
        monday = date(2025, 3, 10)  # Monday
        assert monday.weekday() == 0
        assert weekend_service.get_current_weekend(monday) == date(2025, 3, 7)

    def test_year_rollover(self):
        # Thursday Jan 1, 2026 → upcoming Friday Jan 2
        assert weekend_service.get_current_weekend(date(2026, 1, 1)) == date(2026, 1, 2)
        # Saturday Jan 3 → past Friday Jan 2
        assert weekend_service.get_current_weekend(date(2026, 1, 3)) == date(2026, 1, 2)


class TestWeekendMetaAndDateDerivation:
    def test_weekend_meta(self):
        meta = weekend_service.weekend_meta(date(2025, 8, 8))
        assert meta.as_api_dict() == {
            "weekendOf": "2025-08-08",
            "fridayDate": "2025-08-08",
            "saturdayDate": "2025-08-09",
        }

    def test_party_date_from_weekend(self):
        assert weekend_service.party_date_from_weekend("2025-08-08", "friday") == "2025-08-08"
        assert weekend_service.party_date_from_weekend("2025-08-08", "saturday") == "2025-08-09"

    def test_resolve_party_date_prefers_stored(self):
        party = {"date": "2025-08-09", "weekend_of": "2025-08-08", "day": "friday"}
        assert weekend_service.resolve_party_date(party) == "2025-08-09"

    def test_resolve_party_date_computes_when_missing(self):
        party = {"date": None, "weekend_of": "2025-08-08", "day": "saturday"}
        assert weekend_service.resolve_party_date(party) == "2025-08-09"


class TestCreatableWeekends:
    """Create-party weekends never include a fully past weekend."""

    def test_monday_starts_at_upcoming_friday(self):
        # Mon Aug 11, 2025 → first creatable Friday is Aug 15 (not past Aug 8)
        monday = date(2025, 8, 11)
        assert weekend_service.first_creatable_friday(monday) == date(2025, 8, 15)
        weekends = weekend_service.creatable_weekends(3, monday)
        assert [w.weekend_of for w in weekends] == [
            date(2025, 8, 15),
            date(2025, 8, 22),
            date(2025, 8, 29),
        ]

    def test_saturday_keeps_in_progress_weekend(self):
        saturday = date(2025, 8, 9)
        assert weekend_service.first_creatable_friday(saturday) == date(2025, 8, 8)
        assert weekend_service.is_creatable_party_date(date(2025, 8, 9), saturday) is True
        assert weekend_service.is_creatable_party_date(date(2025, 8, 8), saturday) is False

    def test_rejects_past_and_non_weekend(self):
        today = date(2025, 8, 12)  # Tuesday
        assert weekend_service.is_creatable_party_date(date(2025, 8, 8), today) is False
        assert weekend_service.is_creatable_party_date(date(2025, 8, 13), today) is False  # Wed
        assert weekend_service.is_creatable_party_date(date(2025, 8, 15), today) is True


class TestParseWeekendOf:
    def test_valid_friday(self):
        assert weekend_service.parse_weekend_of("2025-08-08") == date(2025, 8, 8)

    def test_rejects_non_friday(self):
        with pytest.raises(ValueError):
            weekend_service.parse_weekend_of("2025-08-09")  # Saturday

    def test_rejects_garbage(self):
        with pytest.raises(ValueError):
            weekend_service.parse_weekend_of("not-a-date")


class TestRatingWindow:
    def _party(self, doors="10 PM", day="friday", weekend="2025-08-08"):
        return {
            "doors_open": doors,
            "day": day,
            "weekend_of": weekend,
            "date": weekend if day == "friday" else "2025-08-09",
        }

    def test_rating_closed_before_doors(self):
        party = self._party()
        now = datetime(2025, 8, 8, 21, 0, tzinfo=EASTERN)  # 9 PM Friday
        open_, locked = weekend_service.rating_window(party, now)
        assert open_ is False
        assert locked is False

    def test_rating_open_after_doors(self):
        party = self._party()
        now = datetime(2025, 8, 8, 22, 30, tzinfo=EASTERN)  # 10:30 PM Friday
        open_, locked = weekend_service.rating_window(party, now)
        assert open_ is True
        assert locked is False

    def test_rating_locked_after_monday(self):
        party = self._party()
        now = datetime(2025, 8, 12, 0, 0, 1, tzinfo=EASTERN)  # just past Monday midnight end
        # Monday cutoff is end of Monday Aug 11 — Aug 12 00:00:01 is locked
        open_, locked = weekend_service.rating_window(party, now)
        assert locked is True
        assert open_ is False

    def test_rating_still_open_monday_evening(self):
        party = self._party()
        now = datetime(2025, 8, 11, 23, 0, tzinfo=EASTERN)  # Monday 11 PM
        open_, locked = weekend_service.rating_window(party, now)
        assert locked is False
        assert open_ is True
