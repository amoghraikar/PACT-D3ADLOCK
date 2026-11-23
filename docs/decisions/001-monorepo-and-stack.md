# ADR 001: Monorepo Topology, FastAPI, Next.js & Capacitor

## Context
PACT requires a unified system serving:
1. Urban residential apartment residents on Android mobile devices and desktop browsers.
2. Local kirana retailers on desktop/tablet dashboards.
3. Society admins managing deliveries and payments.
4. Independent cloud deployments (Render, Vercel, Docker).

## Decision
1. **Monorepo Layout**: Maintain `apps/api` (backend) and `apps/web` (frontend) within a single repository to ensure synchronized API contracts, shared design guidelines, and streamlined CI/CD.
2. **FastAPI for Backend**: Adopt Python 3.11+ and FastAPI for native async IO, automatic OpenAPI generation, clean dependency injection, and compatibility with Python NLP libraries for Indian voice ordering.
3. **Next.js App Router for Frontend**: Use Next.js with static HTML export (`output: "export"`). This allows hosting on static CDNs (Render Static Sites, Cloudflare) and bundling directly into Android APKs via Capacitor.
4. **Capacitor 7 for Native Android**: Use Capacitor to wrap the Next.js static build into a native Android app, eliminating the need to maintain a separate React Native or Flutter codebase.
5. **PostgreSQL as Source of Truth**: Enforce strict relational persistence with integer paise representations for all financial calculations.

## Consequences
- **Positive**: Single language stack per tier, zero duplicated API typings, instant mobile updates via web builds, strict financial auditability.
- **Trade-off**: Next.js server actions and server-side runtimes cannot be used due to static export requirements; all state and data fetching must be executed via client-side API calls.
