"""Split a composed access code into (room_pin, person_code)."""
from src.config import Config
from src.common.errors import ValidationError


def parse(entered_code: str | None) -> tuple[str, str]:
    if entered_code is None:
        raise ValidationError("Code is required", details={"reason": "INVALID_CODE_FORMAT"})

    normalized = entered_code.strip()

    if not normalized.isdigit():
        raise ValidationError("Code must be numeric", details={"reason": "INVALID_CODE_FORMAT"})

    if len(normalized) != Config.FULL_CODE_LENGTH:
        raise ValidationError(
            f"Code must be {Config.FULL_CODE_LENGTH} digits",
            details={"reason": "INVALID_CODE_LENGTH"},
        )

    pin = normalized[: Config.PIN_LENGTH]
    person_code = normalized[Config.PIN_LENGTH:]
    return pin, person_code
