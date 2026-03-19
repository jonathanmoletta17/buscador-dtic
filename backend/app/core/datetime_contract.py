from __future__ import annotations

from datetime import UTC, datetime
from typing import TypeAlias
from zoneinfo import ZoneInfo

from pydantic import AwareDatetime

from app.config import settings

AwareDateTime: TypeAlias = AwareDatetime
APP_TIMEZONE = ZoneInfo(settings.app_timezone)


def now_in_app_timezone() -> datetime:
    return datetime.now(tz=APP_TIMEZONE)


def now_utc() -> datetime:
    return datetime.now(tz=UTC)


def ensure_aware_datetime(value: datetime | str | None) -> datetime | None:
    if value is None:
        return None

    candidate = value
    if isinstance(candidate, str):
        try:
            candidate = datetime.fromisoformat(candidate)
        except ValueError:
            return None

    if candidate.tzinfo is None or candidate.utcoffset() is None:
        return candidate.replace(tzinfo=APP_TIMEZONE)

    return candidate.astimezone(APP_TIMEZONE)


def serialize_datetime(value: datetime | str | None) -> str | None:
    normalized = ensure_aware_datetime(value)
    return normalized.isoformat() if normalized else None
