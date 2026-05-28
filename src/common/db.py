"""SQLAlchemy engine, session factory, and request-scoped context manager."""
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.config import Config


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


_engine = create_engine(
    Config.DATABASE_URL,
    pool_size=Config.DB_POOL_SIZE,
    max_overflow=Config.DB_MAX_OVERFLOW,
    pool_timeout=Config.DB_POOL_TIMEOUT,
    pool_pre_ping=True,
    future=True,
)

_SessionFactory = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)


@contextmanager
def get_db() -> Iterator[Session]:
    """Yield a Session, commit on success, rollback on error, always close."""
    session = _SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_engine():
    return _engine
