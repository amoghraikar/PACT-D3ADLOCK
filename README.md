# PACT — Collective Commerce Platform

> **One building · One shared monthly cart · One bulk order · One bill, split fairly.**

PACT is a community-driven collective commerce platform that aggregates grocery and household essentials orders for apartment communities, connects them with neighborhood kirana stores, and settles monthly expenses through a mathematically fair bill-splitting algorithm.

---

## Monorepo Architecture

```
PACT/
├── apps/
│   ├── api/                 # FastAPI REST Backend (Python 3.11+)
│   └── web/                 # Next.js 16 App Router Frontend & Static Export
├── android/                 # Capacitor Native Android Shell (Symlink -> apps/web/android)
├── infrastructure/
│   ├── docker/              # Docker Compose (PostgreSQL 16, Kafka) & Dockerfiles
│   └── render/              # Render IaC Blueprint (render.yaml)
├── scripts/                 # Development, verification, and setup automation
├── docs/                    # Technical specifications, API docs, and ADRs
│   ├── architecture/        # Architecture overview and design guarantees
│   ├── api/                 # API v1 specification, error envelopes, and contracts
│   └── decisions/           # Architecture Decision Records (ADRs)
├── .env.example             # Canonical environment template
├── .gitignore
├── Makefile                 # Developer CLI target orchestration
└── README.md
```

---

## Quickstart (Local Development)

### 1. Prerequisites
- **Python**: 3.11+ (verified on Python 3.14 on macOS)
- **Node.js**: v20+ / v24+ (with npm 10+)
- **Docker**: Optional, for running PostgreSQL 16 and Kafka locally

### 2. Setup Environment
```bash
# Setup environment files from template
cp .env.example .env
cp .env.example apps/api/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > apps/web/.env.local
```

### 3. Install Dependencies
```bash
# Backend dependencies
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend dependencies
cd ../web
npm install
```

### 4. Start Development Servers
From the root directory, simply run:
```bash
make dev
```
Or start services independently:
- **FastAPI Backend**: `make api` $\to$ Runs on [http://localhost:8000](http://localhost:8000) (Interactive Swagger Docs at [/docs](http://localhost:8000/docs))
- **Next.js Frontend**: `make web` $\to$ Runs on [http://localhost:3000](http://localhost:3000)
- **Local PostgreSQL**: `make db` $\to$ Starts PostgreSQL 16 on port `5432`

---

## Health Check Endpoints

| Service | Endpoint | Purpose |
|---|---|---|
| **API Root** | `GET http://localhost:8000/` | Root metadata, service name, environment |
| **API Global Health** | `GET http://localhost:8000/health` | Unversioned load-balancer healthcheck |
| **API v1 Health** | `GET http://localhost:8000/api/v1/health` | Versioned API v1 contract healthcheck |
| **Web Frontend Health** | `GET http://localhost:3000/health` | Static/SSR frontend availability healthcheck |

You can test all endpoints in one command:
```bash
make health
```

---

## Developer Commands

```bash
make test         # Run pytest test suite
make lint         # Run Ruff (backend) and ESLint/check-hex (frontend)
make format       # Auto-format Python and TypeScript/React code
make build        # Build Next.js static export bundle (build/ and dist/)
make clean        # Clean build caches, .next, and __pycache__
```

---

## Engineering Roadmap & Milestone Status

- [x] **Milestone 0: Project Initialization** (Clean monorepo topology, health checks, linting, docs, infrastructure)
- [ ] **Milestone 1: Core PostgreSQL Schema & Data Layer** (SQLAlchemy 2 models, Alembic migrations, integer paise)
- [ ] **Milestone 2: Persistent Auth & Strict RBAC** (PostgreSQL users, OTP verification, session cookies, role guards)
- [ ] **Milestone 3: Catalogue & Retailer Inventory** (Product catalogue, full-text search, stock inwarding, auto-reorder)
- [ ] **Milestone 4: Cutoff Clock, Group Cart & Bulk Aggregator** (Cutoff state machine, cart locking, bulk order generation)
- [ ] **Milestone 5: Deterministic F7 Bill-Splitting & Invoices** (Zero-discrepancy allocation, short-pack variance, resident invoices)
- [ ] **Milestone 6: Multilingual Voice Ordering & Payments** (Hindi/Hinglish/English voice parser, Razorpay webhooks)
- [ ] **Milestone 7: Frontend & Android Integration** (Next.js UI & Capacitor Android verification, zero mock data)

---

## Documentation Links
- [Architecture Overview](docs/architecture/overview.md)
- [API v1 Specification](docs/api/v1-specification.md)
- [ADR 001: Monorepo & Technology Stack](docs/decisions/001-monorepo-and-stack.md)
