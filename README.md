# PACT — Pantry Collective Commerce

Apartment community grocery pooling, kirana bulk fulfillment, and deterministic F7 bill splitting.

## Architecture

Unified TypeScript monorepo with zero external message brokers or search clusters:

- `packages/shared` — Shared domain DTOs, formatters, `Asia/Kolkata` cycle clock, and pure integer-paise **F7 Deterministic Billing Engine**.
- `apps/api` — Fastify 5 + TypeScript + Prisma 6 + PostgreSQL 16 REST API and PostgreSQL transactional outbox worker.
- `apps/web` — React 19 + Vite + Tailwind CSS v4 SPA.

## Local Development

### Prerequisites
- Node.js 22+
- PostgreSQL 16 (running locally or via `make db`)

### Setup & Start

```bash
cp .env.example .env
cp .env.example apps/api/.env

npm install
npm --workspace=@pact/shared run build
npm run db:migrate
npm run db:seed

# Start API, PostgreSQL Outbox Worker, and Frontend concurrently
npm run dev
```

- **Web App**: `http://localhost:3000`
- **API**: `http://localhost:8000` (`/health`, `/ready`)

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Render Production Deployment

Connect the repository in Render as a **Blueprint** using `render.yaml`:
- `pact-postgres` — Managed PostgreSQL 16
- `pact-api` — Fastify Node Web Service (`prisma migrate deploy` on boot)
- `pact-worker` — PostgreSQL `SKIP LOCKED` Outbox & Cutoff Worker
- `pact-web` — Static Site built from `apps/web/dist` with SPA fallback
