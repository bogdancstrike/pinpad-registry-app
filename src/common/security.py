"""PIN hashing and code masking helpers."""
import bcrypt

from src.config import Config


def hash_pin(pin: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pin.encode("utf-8"), salt).decode("utf-8")


def verify_pin(pin: str, pin_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def mask_entered_code(entered_code: str, person_code_length: int | None = None) -> str:
    """Hide the room PIN, keep the trailing person code visible for audit.

    "12340023" -> "****0023"
    """
    if not entered_code:
        return ""
    suffix_len = person_code_length or Config.PERSON_CODE_LENGTH
    if len(entered_code) <= suffix_len:
        return "*" * len(entered_code)
    visible = entered_code[-suffix_len:]
    return "*" * (len(entered_code) - suffix_len) + visible
