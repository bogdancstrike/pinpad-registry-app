.PHONY: install backend infra up down logs frontend frontend-install frontend-build migrate migrate-revision seed test lint

PYTHON := .venv/bin/python
PIP    := .venv/bin/pip

# ── Backend ──────────────────────────────────────────────────────────────────
install:
	python3 -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install dist/qf-1.0.2-py3-none-any.whl
	$(PIP) install -r requirements.txt

backend:
	$(PYTHON) main.py

# ── Infrastructure ───────────────────────────────────────────────────────────
infra:
	docker compose up -d postgres

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

# ── Frontend ─────────────────────────────────────────────────────────────────
frontend-install:
	cd frontend && npm install

frontend:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# ── DB / data ────────────────────────────────────────────────────────────────
migrate:
	.venv/bin/alembic upgrade head

migrate-revision:
	.venv/bin/alembic revision --autogenerate -m "$(m)"

seed:
	$(PYTHON) scripts/seed.py

# ── Quality ──────────────────────────────────────────────────────────────────
test:
	$(PYTHON) -m pytest tests/ -v --tb=short

lint:
	$(PYTHON) -m py_compile main.py config.py $$(find src scripts -name '*.py') && echo "Syntax OK"
