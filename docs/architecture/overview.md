# PACT — Architecture Overview

## 1. System Vision
**PACT (Pantry Collective Commerce)** provides collective grocery and daily essentials purchasing for residential apartment societies and gated communities. Instead of each resident ordering individually, households combine their monthly needs into a single consolidated community cart, which is fulfilled by a neighborhood kirana retailer and settled with a mathematically fair, zero-discrepancy bill split.

---

## 2. Monorepo Topology

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
│   ├── architecture/
│   ├── api/
│   └── decisions/
├── .env.example             # Canonical environment template
├── .gitignore
├── Makefile                 # Developer CLI target orchestration
└── README.md                # System overview and quickstart
```

---

## 3. Technology Stack Rationale

| Component | Technology | Rationale |
|---|---|---|
| **Backend API** | FastAPI + Uvicorn | High-performance asynchronous REST, native OpenAPI schema generation, Pydantic type safety. |
| **Database** | PostgreSQL 16 | ACID-compliant relational source of truth with strict integer paise support. |
| **Event Streaming** | Apache Kafka | Event outbox architecture for decoupling order cycles, notifications, and analytics. |
| **Frontend Web** | Next.js 16 (App Router) + React 19 | Server-side pre-rendering, modern layout primitives, Turbopack bundling. |
| **Mobile Shell** | Capacitor 7 | Native Android APK generation directly from static web exports without duplicate codebase. |
| **Styling & Tokens** | Tailwind CSS v4 | Rapid UI development with strict zero-hex design token enforcement. |

---

## 4. Key Architectural Guarantees
1. **Independent Deployability**: Backend and frontend have independent Dockerfiles, configurations, and build pipelines.
2. **Versioned REST API**: All domain routes reside strictly under `/api/v1`.
3. **Integer Arithmetic**: Every monetary value across database, API, and UI is handled in integer paise (`₹1 = 100 paise`).
4. **Tenant & Role Isolation**: RBAC is enforced purely on the backend via FastAPI `Depends()`.
