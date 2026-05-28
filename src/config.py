"""Application configuration. All env-driven knobs live here."""
import os

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).lower() in ("1", "true", "yes", "on")


class Config:
    # ── Application ────────────────────────────────────────────────────────
    SERVICE_NAME = os.getenv("SERVICE_NAME", "pinpad")
    API_PORT     = int(os.getenv("API_PORT", "5000"))
    DEV_MODE     = _bool("DEV_MODE", True)
    LOG_LEVEL    = os.getenv("LOG_LEVEL", "INFO")
    ROLE         = os.getenv("ROLE", "api")

    ALLOWED_ORIGINS = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if o.strip()
    ]

    # ── PostgreSQL ─────────────────────────────────────────────────────────
    DATABASE_URL    = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://pinpad:pinpad@localhost:5432/pinpad",
    )
    DB_POOL_SIZE    = int(os.getenv("DB_POOL_SIZE", "5"))
    DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "5"))
    DB_POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))

    # ── Access codes ───────────────────────────────────────────────────────
    PIN_LENGTH         = int(os.getenv("PIN_LENGTH", "4"))
    PERSON_CODE_LENGTH = int(os.getenv("PERSON_CODE_LENGTH", "4"))
    FULL_CODE_LENGTH   = PIN_LENGTH + PERSON_CODE_LENGTH
    DOOR_UNLOCK_SECONDS = int(os.getenv("DOOR_UNLOCK_SECONDS", "5"))

    # ── Tracing (off for the PoC) ──────────────────────────────────────────
    ENABLE_TRACING = _bool("ENABLE_TRACING", False)
    OTLP_ENDPOINT  = os.getenv("OTLP_ENDPOINT", "http://localhost:4317")

    # ── QF framework legacy keys ───────────────────────────────────────────
    # The framework's etl module reads these from Config at import time, even
    # though the API role never runs the Kafka consumer. Sensible defaults.
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = os.getenv("REDIS_PORT", "6379")
    REDIS_DB   = os.getenv("REDIS_DB", "0")

    WORKER_NAME             = os.getenv("WORKER_NAME", "pinpad")
    WORKER_MODULE           = os.getenv("WORKER_MODULE", "src.tasking.workers")
    KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9094")
    KAFKA_TOPIC_FAST        = os.getenv("KAFKA_TOPIC_FAST", "pinpad_fast")
    KAFKA_TOPIC_SLOW        = os.getenv("KAFKA_TOPIC_SLOW", "pinpad_slow")
    KAFKA_POLL_TIMEOUT_MS          = int(os.getenv("KAFKA_POLL_TIMEOUT_MS", "100"))
    KAFKA_POLL_MAX_RECORDS         = int(os.getenv("KAFKA_POLL_MAX_RECORDS", "200"))
    KAFKA_IDLE_SLEEP_SEC           = float(os.getenv("KAFKA_IDLE_SLEEP_SEC", "0"))
    KAFKA_COMMIT_TICK_SEC          = float(os.getenv("KAFKA_COMMIT_TICK_SEC", "0.2"))
    KAFKA_MAX_JOBS_PER_TP_PER_TICK = int(os.getenv("KAFKA_MAX_JOBS_PER_TP_PER_TICK", "20"))
