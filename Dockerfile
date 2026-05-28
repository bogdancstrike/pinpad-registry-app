FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
COPY dist/ ./dist/
RUN pip install --no-cache-dir ./dist/qf-1.0.2-py3-none-any.whl \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Run migrations + seed on boot, then serve. (PoC convenience.)
CMD ["sh", "-c", "alembic upgrade head && python scripts/seed.py && gunicorn -w 2 -b 0.0.0.0:5000 main:app"]
