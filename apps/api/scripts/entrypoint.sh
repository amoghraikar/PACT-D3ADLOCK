#!/usr/bin/env bash
set -e

echo "[PACT] Starting backend in ENVIRONMENT=${ENVIRONMENT:-production}..."

# Run database migrations before service starts
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "[PACT] Running database migrations (alembic upgrade head)..."
    alembic upgrade head
    echo "[PACT] Migrations completed successfully."
fi

# Optional initial seed if database is empty
if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
    echo "[PACT] Running initial seed..."
    python -m app.seed || echo "[PACT] Seed script exited (may already be seeded)."
fi

TARGET_PORT="${PORT:-8000}"
WORKERS="${WEB_CONCURRENCY:-2}"
echo "[PACT] Launching Uvicorn ASGI server on 0.0.0.0:${TARGET_PORT} with ${WORKERS} workers..."

exec uvicorn app.main:app --host 0.0.0.0 --port "${TARGET_PORT}" --workers "${WORKERS}" --proxy-headers --forwarded-allow-ips='*'
