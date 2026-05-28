"""Small helpers for OpenTelemetry spans.

Usage:
    from src.common.spans import span
    with span("access.attempt", room_code="SERVER_ROOM") as s:
        ...
        s.set_attribute("access.decision", "GRANTED")
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from src.common.tracing import get_tracer

_tracer = get_tracer()


def set_attr(current, key: str, value) -> None:
    if value is None:
        return
    try:
        current.set_attribute(key, value)
    except Exception:
        pass


@contextmanager
def span(name: str, **attrs) -> Iterator:
    with _tracer.start_as_current_span(name) as current:
        for key, value in attrs.items():
            set_attr(current, key, value)
        yield current
