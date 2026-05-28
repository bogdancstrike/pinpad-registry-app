"""Pinpad — entry point.

Boots the HTTP API via QF Framework's FrameworkApp. Endpoints are declared
in maps/endpoint.json and dispatched to thin handlers in src/api.
"""
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from src.config import Config  # noqa: E402


def build_app():
    """Build and return the configured Flask app (used by gunicorn too)."""
    from framework.app import FrameworkApp, FrameworkSettings  # type: ignore

    settings = FrameworkSettings(
        enable_etl=False,
        enable_api=True,
        enable_dynamic_endpoints=True,
        api_host="0.0.0.0",
        api_port=Config.API_PORT,
        api_version="1.0",
        api_title="Pinpad API",
        api_description="PIN-based room access registry simulator",
        endpoint_json_path="maps/endpoint.json",
        enable_tracing=Config.ENABLE_TRACING,
        otlp_endpoint=Config.OTLP_ENDPOINT,
        service_name=Config.SERVICE_NAME,
    )

    fw = FrameworkApp(settings, app_root=BASE_DIR)
    handles = fw.run()

    if handles.app:
        from src.common.correlation import install_flask_hooks
        from src.common.errors import install_flask_error_handlers

        install_flask_hooks(handles.app)
        install_flask_error_handlers(handles.app)

    return handles.app


# gunicorn entry: `gunicorn main:app`
app = build_app()


def main() -> None:
    try:
        from src.common.db import get_engine
        from sqlalchemy import text
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        print("postgres reachable")
    except Exception as e:  # noqa: BLE001
        print(f"postgres not reachable yet: {e}")

    app.run(host="0.0.0.0", port=Config.API_PORT, debug=Config.DEV_MODE)


if __name__ == "__main__":
    main()
