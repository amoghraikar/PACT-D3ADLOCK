.PHONY: dev api web worker db migrate seed test typecheck build

dev:
	npm run dev

api:
	npm --workspace=@pact/api run dev

web:
	npm --workspace=@pact/web run dev

worker:
	npm --workspace=@pact/api run worker:dev

db:
	docker compose up -d postgres

migrate:
	npm run db:migrate

seed:
	npm run db:seed

test:
	npm test

typecheck:
	npm run typecheck

build:
	npm run build
