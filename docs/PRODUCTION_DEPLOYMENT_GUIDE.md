# PACT — Production Deployment & Release Guide

This document is the authoritative operations manual for deploying PACT across **Render**, **Aiven Kafka**, and **Android (Capacitor 7)**.

---

## 1. System Architecture & Topology

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 PACT Client Applications               │
                  │  - Next.js Web (pact-web.onrender.com)                 │
                  │  - Android Native App (com.pact.collective)            │
                  └──────────────────────────┬─────────────────────────────┘
                                             │ HTTPS / WSS
                                             ▼
                  ┌────────────────────────────────────────────────────────┐
                  │              Render Reverse Proxy (TLS)                │
                  │         Port Forwarding & X-Forwarded Headers          │
                  └──────────────────────────┬─────────────────────────────┘
                                             │ HTTP 0.0.0.0:$PORT
                                             ▼
                  ┌────────────────────────────────────────────────────────┐
                  │          FastAPI Web Service (pact-api)                │
                  │   - ASGI Uvicorn (multi-worker)                        │
                  │   - Request Tracing (X-Request-ID)                     │
                  │   - Strict RBAC & Tenant Isolation                     │
                  │   - F7 Fair-Split Deterministic Billing Engine         │
                  └──────────────┬──────────────────────────┬──────────────┘
                                 │                          │
                 SQL (psycopg3)  │                          │ SASL_SSL SCRAM-256
                                 ▼                          ▼
      ┌───────────────────────────────────┐    ┌───────────────────────────┐
      │     Render Managed PostgreSQL     │    │   Aiven Managed Kafka     │
      │   - Alembic Migrations            │    │ - pact.order.events       │
      │   - Integer Paise Financials      │    │ - pact.billing.events     │
      │   - Transactional Event Outbox    │    │ - pact.notification.events│
      └───────────────────────────────────┘    └───────────────────────────┘
```

---

## 2. Target Environments & Component Summary

| Component | Target Platform | Type | Configuration / Build |
| :--- | :--- | :--- | :--- |
| **Backend API** | Render Web Service | Python 3.11 / FastAPI | `apps/api/scripts/entrypoint.sh` |
| **Frontend Web** | Render Static Site | Static Export | `npm ci && npm run build` (publish: `out/`) |
| **Database** | Render PostgreSQL | PostgreSQL 16 | Managed, Connection Pooling (`pool_size=10, max_overflow=20`) |
| **Event Transport** | Aiven Kafka | Apache Kafka | `SASL_SSL` SCRAM-SHA-256 |
| **Mobile App** | Google Play / Sideload | Capacitor 7 Android APK | `./scripts/build_android_apks.sh` |

---

## 3. Render Blueprint Deployment

PACT is fully configured as Infrastructure as Code via [`render.yaml`](file:///Users/zeus/Documents/PACT/render.yaml).

### Steps to Deploy on Render:
1. Push your repository to GitHub (`main` branch).
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** > **Blueprint**.
4. Connect the `PACT` repository.
5. Render detects `render.yaml` and provisions:
   - `pact-postgres` (PostgreSQL 16)
   - `pact-api` (FastAPI Web Service)
   - `pact-web` (Next.js Static Site)
   - `pact-worker` (Transactional Outbox Background Worker)
   - `pact-cycle-tick` (Cron Shopping Cycle Evaluator)
6. Supply sensitive production secrets:
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
   - `KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_SASL_USERNAME`, `KAFKA_SASL_PASSWORD`
7. Click **Apply**.

---

## 4. Database Safety & Pre-Readiness Migrations

1. Before serving traffic, Render executes `apps/api/scripts/entrypoint.sh`.
2. The script executes:
   ```bash
   alembic upgrade head
   ```
3. Only when migrations succeed does the Uvicorn ASGI server launch on `0.0.0.0:$PORT`.
4. If migrations fail, the deployment immediately halts, keeping the previous stable revision live.
5. Health and readiness endpoints:
   - `/health` — Liveness check.
   - `/ready` — Verifies database connection pool and query execution.

---

## 5. Android APK Release Pipeline

### Build Commands:
```bash
./scripts/build_android_apks.sh
```

### Outputs in `release/`:
- **Debug APK**: `release/pact-debug.apk` (5.4 MB)
- **Signed Release APK**: `release/pact-release-signed.apk` (4.4 MB)
- **Unsigned Release APK**: `release/pact-release-unsigned.apk` (4.4 MB)

### Installation & Verification via ADB:
```bash
adb devices
adb install -r release/pact-release-signed.apk
adb shell am start -n com.pact.collective/.MainActivity
```

---

## 6. End-to-End Persona Verification Matrix

| Flow | Persona | Endpoint / Route | Verification Result |
| :--- | :--- | :--- | :--- |
| **OTP Auth** | All | `/api/v1/auth/verify-otp` | PASS (Bearer token + HttpOnly cookie issued) |
| **Catalogue** | Customer | `/api/v1/catalogue/products` | PASS (12 categories, 70+ variants, pagination) |
| **Shared Cart** | Customer | `/api/v1/cart` | PASS (Personal basket + aggregate community demand) |
| **Voice Ordering** | Customer | `/customer/speak` | PASS (Hindi / Hinglish speech normalization & cart commit) |
| **Cutoff Engine** | System | `/api/v1/cycles/current` | PASS (Asia/Kolkata 22nd 17:27 cutoff evaluation) |
| **Retailer Packing**| Retailer | `/api/v1/retailer/orders` | PASS (Short-packing & unavailable item audit) |
| **F7 Billing** | Retailer/Customer | `/api/v1/billing/*` | PASS (Zero discrepancy invariant guaranteed) |
| **Razorpay Payment**| Customer | `/api/v1/payments/create-order` | PASS (Mock gateway & webhook verification) |
| **Outbox Events** | Worker | `OutboxEvent` table | PASS (Atomic persistence in PostgreSQL) |
| **Handover** | Admin | `/api/v1/admin/deliveries` | PASS (Doorstep resident confirmation) |
| **Global Telemetry**| Platform Admin | `/api/v1/platform/*` | PASS (Communities, retailers, audit trail) |

---

## 7. Zero Credential Leak Guarantee

Responses from public, health, metadata, and error endpoints are verified by automated test `test_zero_credential_leak_in_production` to ensure no database passwords, JWT secrets, Razorpay keys, or Kafka credentials ever leak.
