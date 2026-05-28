"""Access attempt endpoint."""
from src.api._helpers import payload
from src.common.db import get_db
from src.domain.access import service as access_service


def attempt(app, operation, request, **kwargs):
    body = payload()
    with get_db() as db:
        result = access_service.execute(db, body)
    status = 200 if result["decision"] == "GRANTED" else 200
    return (result, status)
