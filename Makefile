.PHONY: help dev api web db kafka test lint format health build clean

help:
	@echo "PACT Monorepo Developer Commands:"
	@echo "  make dev         - Start both FastAPI backend and Next.js frontend"
	@echo "  make api         - Start FastAPI backend API on http://localhost:8000"
	@echo "  make web         - Start Next.js frontend on http://localhost:3000"
	@echo "  make db          - Start PostgreSQL 16 via Docker Compose"
	@echo "  make kafka       - Start Apache Kafka KRaft via Docker Compose"
	@echo "  make test        - Run backend pytest tests"
	@echo "  make lint        - Run Ruff (backend) and ESLint/check-hex (frontend)"
	@echo "  make format      - Run Ruff format and Prettier"
	@echo "  make health      - Test live health endpoints"
	@echo "  make build       - Build Next.js static export bundle"
	@echo "  make clean       - Remove cached build directories and artifacts"

dev:
	@./scripts/dev.sh

api:
	cd apps/api && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

web:
	cd apps/web && npm run dev

db:
	docker compose up -d postgres

kafka:
	docker compose up -d kafka

test:
	cd apps/api && .venv/bin/pytest

lint:
	cd apps/api && .venv/bin/ruff check app tests
	cd apps/web && npm run lint

format:
	cd apps/api && .venv/bin/ruff format app tests
	cd apps/web && npm run format

health:
	@./scripts/healthcheck.sh

build:
	cd apps/web && npm run build

clean:
	rm -rf apps/web/.next apps/web/out apps/web/build apps/web/dist
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
