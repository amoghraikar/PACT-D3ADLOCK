#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "===================================================="
echo " Starting PACT Local Development Environment"
echo "===================================================="

trap 'echo ""; echo "Shutting down PACT services..."; kill 0' SIGINT SIGTERM EXIT

# Start FastAPI Backend
echo "[1/2] Starting FastAPI backend on http://127.0.0.1:8000..."
cd "$ROOT_DIR/apps/api"
if [ -d ".venv" ]; then
    .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
else
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
fi

# Start Next.js Frontend
echo "[2/2] Starting Next.js frontend on http://localhost:3000..."
cd "$ROOT_DIR/apps/web"
npm run dev &

wait
