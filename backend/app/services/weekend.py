"""
Authoritative weekend and rating-window helpers (US/Eastern).

Single source of truth for:
- current weekend key (Friday date)
- weekend_of + day → party date
- rating open / locked windows
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, time
from zoneinfo import ZoneInfo

EASTERN = ZoneInfo("America/New_York")


@dataclass(frozen=True)
class WeekendMeta:
    """Authoritative weekend metadata for API consumers."""

    weekend_of: date  # Friday key
    friday_date: date
    saturday_date: date

    def as_api_dict(self) -> dict:
        return {
            "weekendOf": self.weekend_of.isoformat(),
            "fridayDate": self.friday_date.isoformat(),
            "saturdayDate": self.saturday_date.isoformat(),
        }


def now_eastern() -> datetime:
    return datetime.now(EASTERN)


def today_eastern() -> date:
    """Today's calendar date in US/Eastern."""
    return now_eastern().date()


def get_current_weekend(today: date | None = None) -> date:
    """Friday of the current or next weekend.

    Sat/Sun/Mon → past Friday.
    Tue–Fri → upcoming Friday (Friday itself → today).
    """
    today = today or today_eastern()
    weekday = today.weekday()  # Mon=0 … Sun=6
    if weekday in (5, 6):  # Sat, Sun
        days_until_friday = (4 - weekday) % 7 - 7
    elif weekday == 0:  # Mon → past Friday (rollover at Tuesday 00:00)
        days_until_friday = -3
    else:  # Tue–Fri
        days_until_friday = (4 - weekday) % 7
    return today + timedelta(days=days_until_friday)


def weekend_meta(weekend_of: date | None = None) -> WeekendMeta:
    friday = weekend_of or get_current_weekend()
    return WeekendMeta(
        weekend_of=friday,
        friday_date=friday,
        saturday_date=friday + timedelta(days=1),
    )


def parse_weekend_of(value: str) -> date:
    """Parse YYYY-MM-DD weekend_of; raises ValueError on garbage."""
    parsed = date.fromisoformat(value)
    if parsed.weekday() != 4:
        raise ValueError("weekend_of must be a Friday (YYYY-MM-DD)")
    return parsed


def party_date_from_weekend(weekend_of: str | date, day: str) -> str:
    """Derive ISO party date from weekend_of (Friday) + day."""
    friday = weekend_of if isinstance(weekend_of, date) else date.fromisoformat(weekend_of)
    if day == "saturday":
        return (friday + timedelta(days=1)).isoformat()
    return friday.isoformat()


def resolve_party_date(party: dict) -> str:
    """Prefer stored date; else compute from weekend_of + day."""
    party_date = party.get("date") or ""
    if party_date:
        return party_date
    weekend_of = party.get("weekend_of")
    day = party.get("day")
    if weekend_of and day:
        return party_date_from_weekend(weekend_of, day)
    return ""


def parse_doors_open(doors_open: str, party_date: str) -> datetime:
    """Parse doors_open (e.g. '10 PM') + party date into Eastern datetime."""
    party_dt = date.fromisoformat(party_date)
    time_str = doors_open.strip().upper()
    for fmt in ("%I %p", "%I:%M %p", "%I%p", "%I:%M%p"):
        try:
            parsed_time = datetime.strptime(time_str, fmt).time()
            return datetime.combine(party_dt, parsed_time, tzinfo=EASTERN)
        except ValueError:
            continue
    return datetime.combine(party_dt, time(22, 0), tzinfo=EASTERN)


def get_monday_cutoff(weekend_of: str | date) -> datetime:
    """Monday 11:59:59.999999 PM Eastern for the given weekend Friday."""
    friday = weekend_of if isinstance(weekend_of, date) else date.fromisoformat(weekend_of)
    monday = friday + timedelta(days=3)
    return datetime.combine(monday, time.max, tzinfo=EASTERN)


def is_rating_active(party: dict, now: datetime | None = None) -> bool:
    """True once current Eastern time >= doors_open on the party date."""
    now = now or now_eastern()
    party_date = resolve_party_date(party)
    if not party_date:
        return False
    doors_open_dt = parse_doors_open(party.get("doors_open") or "10 PM", party_date)
    return now >= doors_open_dt


def is_rating_locked(party: dict, now: datetime | None = None) -> bool:
    """True after Monday 11:59 PM Eastern of the party weekend."""
    now = now or now_eastern()
    weekend_of = party.get("weekend_of") or ""
    if not weekend_of:
        return False
    return now > get_monday_cutoff(weekend_of)


def rating_window(party: dict, now: datetime | None = None) -> tuple[bool, bool]:
    """Return (rating_open, rating_locked) for a party row."""
    locked = is_rating_locked(party, now)
    if locked:
        return False, True
    return is_rating_active(party, now), False
