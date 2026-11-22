#!/bin/sh
set -e

echo "[PACT] Starting FastAPI backend on http://127.0.0.1:8000..."
cd /app/apps/api
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "[PACT] Waiting for backend to initialize..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
    echo "[PACT] Backend is healthy and ready!"
    break
  fi
  sleep 1
done

TARGET_PORT="${PORT:-3000}"
echo "[PACT] Starting Next.js frontend on port ${TARGET_PORT}..."
cd /app/apps/web
exec npx next start -p "${TARGET_PORT}" -H 0.0.0.0
