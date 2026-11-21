.PHONY: dev api web db migrate seed test lint demo

# Start full development environment (Postgres, API, Web)
dev:
	docker compose up -d postgres
	@echo "Postgres running. Starting API and Web..."
	@trap 'kill 0' SIGINT; \
	(cd apps/api && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) & \
	(cd apps/web && npm run dev) & \
	wait

# Start backend API
api:
	cd apps/api && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Start web app
web:
	cd apps/web && npm run dev

# Start postgres in docker
db:
	docker compose up -d postgres

# Database migrations (P01)
migrate:
	@if [ -d "apps/api/migrations" ]; then \
		cd apps/api && .venv/bin/alembic upgrade head; \
	else \
		echo "Migrations not yet initialized (P01)"; \
	fi

# Seed database (P02)
seed:
	@echo "Seed script not yet implemented (P02)"

# Run backend and frontend tests
test:
	cd apps/api && .venv/bin/pytest tests -v

# Run backend and frontend linters
lint:
	cd apps/api && .venv/bin/ruff check app tests
	cd apps/web && npm run lint

# Demo target (P26)
demo:
	@echo "Resetting dev database and seeding Golden Scenario G..."
	cd apps/api && .venv/bin/python -m app.modules.dev.seed_golden
	@echo "Ready at start of Scenario G. Open http://localhost:3000"

demo-fast:
	@echo "Running Golden Scenario G fast forward through API..."
	cd apps/api && .venv/bin/python -m app.modules.dev.fast_forward_g
	@echo "Scenario G advanced to 'bill ready'. Ready for customer payments at http://localhost:3000/customer/bill"
