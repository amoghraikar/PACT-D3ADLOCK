#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Setting up PACT environment files..."

if [ ! -f "$ROOT_DIR/.env" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "Created .env from .env.example"
else
    echo ".env already exists."
fi

if [ ! -f "$ROOT_DIR/apps/api/.env" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/apps/api/.env"
    echo "Created apps/api/.env"
fi

if [ ! -f "$ROOT_DIR/apps/web/.env.local" ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > "$ROOT_DIR/apps/web/.env.local"
    echo "Created apps/web/.env.local"
fi

echo "Environment setup complete."
