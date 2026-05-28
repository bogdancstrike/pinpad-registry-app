"""Shared helpers for thin API handlers."""
from flask import request as flask_request


def payload() -> dict:
    data = flask_request.get_json(force=True, silent=True)
    return data or {}


def query() -> dict:
    return {k: v for k, v in flask_request.args.items()}


def view_arg(kwargs: dict, name: str):
    return kwargs.get(name) or (flask_request.view_args or {}).get(name)
