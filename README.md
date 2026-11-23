# PACT — Complete Codebase Architecture & System Blueprint

> **Notice**: This document contains the exhaustive, end-to-end architectural summary and specification of the PACT codebase. It is designed as a standalone, comprehensive blueprint suitable for LLMs (such as ChatGPT) and software engineers to re-create, prompt, and build the entire application from scratch.

---

## 1. Executive Summary & Vision

### 1.1 The Problem
In urban apartment complexes and residential societies across India, households independently buy groceries and daily essentials from quick-commerce apps or local kirana stores. This leads to:
1. **Higher retail prices**: Residents lose bulk purchasing discounts that institutional buyers receive.
2. **Delivery chaos**: Dozens of delivery agents enter gated communities daily, causing traffic congestion and security overhead.
3. **Kirana marginalization**: Neighborhood kirana stores lose business to venture-backed quick-commerce dark stores.

### 1.2 The PACT Solution
**PACT (Pantry Collective Commerce)** is a community-driven collective commerce platform that connects apartment communities with neighborhood kirana stores.
- **One Building · One Shared Monthly Cart · One Consolidated Bulk Order · One Fairly Split Bill**.
- Residents add items throughout the month to a shared community cart using text or voice (English, Hindi, Hinglish).
- On a scheduled monthly cutoff (the **22nd of each month at 5:27 PM IST**), the cart locks and aggregates into a single bulk order.
- The local retailer receives, accepts, and packs the bulk order, adjusting for out-of-stock or short-packed items.
- Upon dispatch, PACT's deterministic bill-splitting algorithm divides the total bill among participating households.
- Residents pay their individual share through integrated payment gateways, while the society admin manages doorstep distribution and delivery handovers.

---

## 2. Core Business Logic & State Machines

### 2.1 Monthly Buying Cycle & Cutoff Clock
The core temporal engine governs the ordering schedule in `Asia/Kolkata` time:
- **Cutoff Deadline**: Configured via environment variables (`CYCLE_CUTOFF_DAY=22`, `CYCLE_CUTOFF_HOUR=17`, `CYCLE_CUTOFF_MINUTE=27`).
- **Active State (`OPEN`)**: Residents can add, update, and remove items in their shared community cart.
- **Locked State (`LOCKED`)**: At 17:27 IST on the 22nd, any cart mutation returns `HTTP 409 Conflict` (`ORDER_CYCLE_LOCKED`). The group cart transitions into a consolidated retailer bulk order with an idempotent ID format (e.g., `ord-comm-green-2026-11`).
- **Fulfillment & Billing State**: The retailer processes the order; bills unlock for residents only after the retailer explicitly finalizes and sends the bill.

### 2.2 Deterministic Fair Bill-Splitting Algorithm (F7 Specification)
The billing engine (`apps/api/app/modules/billing/split.py`) implements a zero-discrepancy allocation algorithm using integer math (paise):
1. **Base Amount Allocation**: Each resident's base charge equals their consumed quantities multiplied by unit prices.
2. **Short-Pack & OOS Handling**: If a retailer packs fewer items than requested (short-pack), charges are adjusted proportionally across households that requested that variant.
3. **Product Discount Distribution**: Tiered bulk discounts from the retailer are passed through to residents proportional to their item contributions.
4. **Delivery & Platform Charge Distribution**: Collective delivery fees are divided equally (or pro-rata by weight/value) across active ordering households.
5. **Integer Paise Invariance**: All monetary calculations operate in integer paise (`₹1 = 100 paise`). Any fractional remainder is allocated deterministically to the largest order holder, ensuring:
   $$\sum \text{resident\_invoices} \equiv \text{total\_retailer\_bill}$$

### 2.3 Role-Based Access Control (RBAC) & Personas
The system enforces four distinct roles with strictly isolated tenant contexts:
1. **Resident / Customer (`customer`)**:
   - Persona: *Asha* (`+919999900001`), *Bharat*, *Dev*, *Esha*.
   - Capabilities: Browse catalogue, manage cart items, voice ordering, view monthly split bill, execute online payment via UPI/Cards.
2. **Retailer (`retailer`)**:
   - Persona: *Ravi* / *Mohan Store* (`+919999900021`).
   - Capabilities: Inventory management (stock tracking, inwarding, auto-reorder), accept/reject community orders, item packing adjustments, bill generation and dispatch, payment collection tracking.
3. **Apartment Admin (`admin`)**:
   - Persona: *Meera* (`+919999900031`).
   - Capabilities: Society oversight dashboard, payment collection status (paid vs. unpaid), WhatsApp/SMS payment reminders (hourly rate-limited), delivery handover sign-off.
4. **Platform Admin (`platform_admin`)**:
   - Capabilities: Global platform monitoring, store-to-society mapping, system-wide analytics.

### 2.4 Multilingual Voice-First Ordering Engine
Located in `apps/api/app/modules/voice/`, this subsystem allows residents to order groceries using natural voice inputs:
- **Languages**: English (`en-IN`), Hindi in Devanagari script (`hi-IN`), and Latin-scripted Hinglish.
- **Architecture**:
  - `parser.py`: Cleans audio transcript, extracts quantity numbers (supporting Hindi words like *ek, do, aadha, paav, dedh*), and isolates units (*kg, g, litre, packet, piece*).
  - `normaliser.py`: Canonicalizes Hindi terms (*chawal* → rice, *cheeni/shakkar* → sugar, *doodh* → milk, *tel* → oil).
  - `matcher.py`: Performs fuzzy string matching (Levenshtein distance and phonetic matching) against the 60+ product catalogue.
  - `interpreter.py`: Produces deterministic cart actions (`ADD`, `REMOVE`, `CLARIFY`).
  - **Clarification Dialog**: When ambiguity exists (e.g., user asks for "rice" but catalogue has *Sona Masoori Rice* and *Basmati Rice*), the engine returns structured clarification questions with selectable options.

### 2.5 Payments, Razorpay Integration & Idempotent Webhooks
- **Payment Gateway**: Supports Razorpay with fallback to an in-memory Mock Payment Gateway (`PAYMENT_GATEWAY=mock`).
- **Signature Verification**: Validates HMAC-SHA256 signatures on incoming payment webhooks (`X-Razorpay-Signature`).
- **Idempotency & Race-Condition Safety**: Multiple concurrent webhook deliveries or verification calls check invoice payment state before applying transitions. If an already-paid invoice receives another payment, it transitions to `needs_refund`.

### 2.6 Event Outbox & In-App Notification System
- **Outbox Pattern**: Events (`ORDER_CREATED`, `BILL_FINALISED`, `PAYMENT_RECEIVED`, `DELIVERY_READY`) are written to an event transport (in-memory queue for dev, Apache Kafka for production).
- **Notification Service**: Delivers targeted in-app alerts to residents with tenant isolation (users can never read notifications belonging to other residents).

---

## 3. Tech Stack & Engineering Standards

| Layer | Technologies & Libraries | Architectural Role |
|---|---|---|
| **Backend Framework** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 | High-performance async REST API |
| **Backend Testing** | Pytest, Hypothesis (Property-Based Testing), Starlette TestClient | 45 comprehensive automated tests |
| **Persistence** | PostgreSQL 16 (production), JSON flat-file stores with thread locks (development fallback) | Hybrid relational & document storage |
| **Frontend Framework** | Next.js 16.4.6 (App Router, Turbopack), React 19, TypeScript 5 | Multi-tenant SPA & SSR web interface |
| **Mobile Runtime** | Capacitor 7.4.4, Android SDK (Platform 36, Zulu OpenJDK 21) | Native Android mobile application |
| **Styling & Tokens** | Tailwind CSS v4, PostCSS | Strict design token enforcement (0 hex violations) |
| **State Management** | React Context (`AuthContext`, `CartContext`), `sessionStorage` | Tab-scoped authentication, optimistic cart updates |
| **API Client** | Typed `apiClient` with `ApiError` envelope, global browser fetch proxy | Zero-config cross-origin API integration |

---

## 4. Complete Codebase Structure & Directory Map

```
PACT/
├── Dockerfile                     # Multi-stage production container (FastAPI + Next.js unified)
├── render.yaml                    # Infrastructure-as-code blueprint for Render deployment
├── start.sh                       # Production entrypoint script orchestrating backend & frontend
├── package.json                   # Root tooling scripts
├── README.md                      # Complete system blueprint & architectural documentation
│
├── apps/
│   ├── api/                       # FASTAPI BACKEND SERVICE
│   │   ├── Dockerfile             # Standalone API container definition
│   │   ├── requirements.txt       # Python dependencies (fastapi, uvicorn, pydantic, pytest, etc.)
│   │   ├── pytest.ini             # Pytest test discovery & hypothesis configuration
│   │   ├── main.py                # Root module proxy
│   │   │
│   │   ├── app/
│   │   │   ├── main.py            # FastAPI application factory, middleware, CORS, routers
│   │   │   │
│   │   │   ├── core/              # Foundational backend kernel
│   │   │   │   ├── config.py      # Pydantic Settings (cutoffs, JWT secret, CORS, database URLs)
│   │   │   │   ├── clock.py       # UTC and Asia/Kolkata timezone datetime utilities
│   │   │   │   ├── db.py          # SQLAlchemy database engine and session generator
│   │   │   │   ├── deps.py        # Auth dependencies: get_current_user, require_customer, etc.
│   │   │   │   ├── errors.py      # AppError hierarchy, C6 standard JSON error envelope
│   │   │   │   ├── middleware.py  # Request logging with X-Request-ID and duration tracking
│   │   │   │   ├── pagination.py  # Standardized PaginationParams, PaginatedMeta, PaginatedResponse
│   │   │   │   └── security.py    # HMAC-SHA256 session token generation and verification
│   │   │   │
│   │   │   ├── modules/           # Domain feature modules
│   │   │   │   ├── auth/          # Authentication, OTP, session management
│   │   │   │   │   ├── router.py  # Auth & Onboarding endpoints (/otp/request, /switch-persona, etc.)
│   │   │   │   │   └── users_store.json # Persisted user seed data
│   │   │   │   │
│   │   │   │   ├── billing/       # Billing and algorithmic fair split
│   │   │   │   │   └── split.py   # Deterministic F7 bill splitting implementation
│   │   │   │   │
│   │   │   │   ├── cart/          # Collective community cart
│   │   │   │   │   ├── router.py  # Cart controller endpoints (/cart, /cart/items)
│   │   │   │   │   ├── service.py # Cart business logic, validation, bulk order generation
│   │   │   │   │   ├── cycle.py   # Cutoff computation & cycle boundary detection
│   │   │   │   │   ├── cutoff.py  # Clock utilities for lock state evaluation
│   │   │   │   │   └── cart_store.json # Cart persistence store
│   │   │   │   │
│   │   │   │   ├── catalogue/     # Product catalogue & search
│   │   │   │   │   ├── router.py  # Catalogue endpoints with pagination and category filtering
│   │   │   │   │   ├── search.py  # Keyword, category, and token search logic
│   │   │   │   │   ├── products_data.py # 60+ items across 12 grocery categories
│   │   │   │   │   └── catalogue_store.json
│   │   │   │   │
│   │   │   │   ├── retailer/      # Retailer inventory & order processing
│   │   │   │   │   ├── orders_router.py # Order lifecycle: accept, pack, draft bill, send bill
│   │   │   │   │   ├── inventory_router.py # Stock management, inwarding, auto-reorder
│   │   │   │   │   ├── dashboard_router.py # Financial performance & collection summaries
│   │   │   │   │   └── orders_store.json
│   │   │   │   │
│   │   │   │   ├── admin/         # Society administrator oversight
│   │   │   │   │   └── dashboard_router.py # Overview metrics, invoice lists, reminder triggers
│   │   │   │   │
│   │   │   │   ├── voice/         # Multilingual speech ordering
│   │   │   │   │   ├── router.py  # /api/v1/voice/parse endpoint
│   │   │   │   │   ├── parser.py  # Transcript number & unit parsing
│   │   │   │   │   ├── normaliser.py # Hindi/Hinglish vocabulary normalizer
│   │   │   │   │   ├── matcher.py # Fuzzy catalogue product matcher
│   │   │   │   │   ├── interpreter.py # Cart action synthesizer
│   │   │   │   │   └── tables.py  # Dictionaries for numerals, units, and Hindi aliases
│   │   │   │   │
│   │   │   │   ├── payments/      # Payment gateway & invoice settlement
│   │   │   │   │   ├── invoices_router.py # Resident invoices and settlement endpoints
│   │   │   │   │   ├── webhooks_router.py # Gateway webhook receiver with signature validation
│   │   │   │   │   ├── service.py # Payment verification & refund flagging logic
│   │   │   │   │   └── gateway.py # Mock and Razorpay client integrations
│   │   │   │   │
│   │   │   │   ├── notifications/ # Event-driven alerts
│   │   │   │   │   ├── router.py  # In-app notifications endpoints
│   │   │   │   │   ├── service.py # Notification creation and mark-as-read
│   │   │   │   │   └── handlers.py # Event listener hooks
│   │   │   │   │
│   │   │   │   ├── events/        # Outbox messaging architecture
│   │   │   │   │   ├── dispatch.py# Event dispatcher
│   │   │   │   │   ├── transport.py# In-memory & Kafka event transports
│   │   │   │   │   └── topics.py  # Standard system event definitions
│   │   │   │   │
│   │   │   │   └── dev/           # Local development mocks & utilities
│   │   │   │       ├── router.py  # Persona quick-switcher, time manipulation
│   │   │   │       └── mock_checkout.py # Simulated payment test harness
│   │   │   │
│   │   │   └── workers/           # Background daemon processes
│   │   │       ├── consumer.py    # Async Kafka / outbox event consumer
│   │   │       └── cycle_tick.py  # Cron worker evaluating cutoff triggers
│   │   │
│   │   └── tests/                 # Automated test suite (45/45 passing)
│   │       ├── conftest.py        # TestClient fixtures, auth tokens, mock databases
│   │       ├── test_admin_dashboard.py
│   │       ├── test_auth_api.py
│   │       ├── test_bill_splitting.py # 100% mathematical coverage of F7 worked examples
│   │       ├── test_cart_api.py   # Cutoff locks, batch upserts, tenant isolation
│   │       ├── test_health.py     # Healthcheck & error envelope compliance
│   │       ├── test_notifications.py
│   │       ├── test_payments_api.py # Webhooks, racing conditions, bad signatures
│   │       ├── test_retailer_dashboard.py
│   │       ├── test_retailer_orders_api.py # Full order lifecycle & packing constraints
│   │       └── test_voice_api.py  # Table-driven testing of 40 Hindi/Hinglish voice phrases
│   │
│   └── web/                       # NEXT.JS 16 FRONTEND APPLICATION
│       ├── package.json           # Dependencies, Next.js build scripts
│       ├── next.config.ts         # Output export configuration, rewrites, image unoptimization
│       ├── capacitor.config.ts    # Mobile app bundle ID, webDir: "build"
│       ├── postcss.config.mjs     # Tailwind CSS PostCSS plugin integration
│       │
│       ├── lib/
│       │   ├── api.ts             # Central apiClient, ApiError, URL resolver, fetch interceptor
│       │   ├── format.ts          # INR currency formatting (₹), date/time formatters
│       │   ├── catalogue-data.ts  # Fallback client-side catalogue constants
│       │   └── services/          # Modular API service abstraction layer
│       │       ├── auth.service.ts
│       │       ├── cart.service.ts
│       │       ├── catalogue.service.ts
│       │       └── orders.service.ts
│       │
│       ├── scripts/
│       │   └── check-hex.mjs      # Linter enforcing 0 raw hex colors outside globals.css
│       │
│       ├── src/
│       │   ├── context/
│       │   │   ├── AuthContext.tsx# Tab-scoped session state, persona switcher, auth guards
│       │   │   └── CartContext.tsx# Optimistic cart mutations, polling sync
│       │   │
│       │   ├── hooks/
│       │   │   ├── useApi.ts      # Reusable async data-fetching hook with loading & error states
│       │   │   └── useToast.ts    # Transient feedback toast manager
│       │   │
│       │   ├── components/
│       │   │   ├── ErrorBoundary.tsx # React error boundary catching render crashes
│       │   │   ├── auth/
│       │   │   │   └── ProtectedRoute.tsx # Route guard enforcing required user roles
│       │   │   ├── layout/    # Role-specific dashboard layouts
│       │   │   │   ├── CustomerLayout.tsx
│       │   │   │   ├── RetailerLayout.tsx
│       │   │   │   ├── AdminLayout.tsx
│       │   │   │   └── PlatformLayout.tsx
│       │   │   └── ui/        # Atomic design system component library
│       │   │       ├── Banner.tsx, BottomNav.tsx, Button.tsx, Card.tsx
│       │   │       ├── DataTable.tsx, Dialog.tsx, EmptyState.tsx, Logo.tsx
│       │   │       ├── MicButton.tsx, MoneyText.tsx, MonthTimeline.tsx
│       │   │       ├── NotificationBell.tsx, OtpInput.tsx, Pagination.tsx
│       │   │       ├── PhoneField.tsx, ProgressBar.tsx, Sheet.tsx
│       │   │       ├── Sidebar.tsx, Skeleton.tsx, StatusPill.tsx
│       │   │       ├── Stepper.tsx, Tabs.tsx, TextField.tsx, Toast.tsx, TopBar.tsx
│       │   │
│       │   └── app/               # Next.js App Router Page Tree
│       │       ├── layout.tsx     # Root HTML layout, SEO metadata, global CSS, error boundary
│       │       ├── globals.css    # Tailwind CSS imports, CSS design token definitions
│       │       ├── page.tsx       # Root Landing Page: Onboarding portal & persona switcher
│       │       ├── login/         # Phone OTP login screen
│       │       ├── onboarding/    # Resident & Retailer multi-step registration wizard
│       │       ├── customer/      # Customer portal
│       │       │   ├── page.tsx   # Customer home: active cycle timeline, pending bill card
│       │       │   ├── shop/      # Catalogue browser, category filters, quick-add
│       │       │   │   ├── page.tsx
│       │       │   │   └── loading.tsx # Suspense skeleton loading state
│       │       │   ├── list/      # Community group cart: item counts, cutoff countdown
│       │       │   ├── speak/     # Voice shopping screen with live waveform and mic trigger
│       │       │   ├── bill/      # Current unlocked bill details, breakdown, pay button
│       │       │   └── bills/     # Historical bills and receipt view
│       │       │       └── [id]/page.tsx # Bill detail with generateStaticParams()
│       │       ├── retailer/      # Retailer portal
│       │       │   ├── page.tsx   # Retailer overview: metrics, pending actions
│       │       │   ├── orders/    # Bulk order fulfillment: accept, pack items, send bill
│       │       │   │   ├── page.tsx
│       │       │   │   └── loading.tsx
│       │       │   ├── inventory/ # Stock monitoring, batch inwarding, auto-reorder
│       │       │   │   ├── page.tsx
│       │       │   │   └── loading.tsx
│       │       │   └── payments/  # Resident collection tracking per order
│       │       ├── admin/         # Apartment Admin portal
│       │       │   ├── page.tsx   # Society dashboard: collection progress, reminder triggers
│       │       │   ├── paid/      # Filtered paid invoices view
│       │       │   ├── unpaid/    # Filtered unpaid invoices with WhatsApp reminder button
│       │       │   └── loading.tsx
│       │       ├── platform/      # Platform admin monitoring
│       │       └── styleguide/    # Design system living documentation
│       │
│       └── android/               # Capacitor Android native project
│           ├── app/
│           │   ├── build.gradle
│           │   └── src/main/AndroidManifest.xml
│           └── gradlew
```

---

## 5. API Contract Reference

All endpoints return a uniform JSON envelope on error (`C6 Envelope`):
```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human readable error description",
    "details": null
  }
}
```

### 5.1 Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/otp/request`: Request 6-digit verification code for a phone number. In dev mode (`OTP_MODE=dev`), OTP defaults to `000000`.
- `POST /api/v1/auth/otp/verify`: Verify OTP, generate signed session token, set HTTP-only cookie, and return user profile.
- `GET /api/v1/auth/me`: Retrieve currently authenticated user context, community membership, or retailer profile.
- `POST /api/v1/auth/switch-persona`: Instant persona switching for testing (`asha`, `bharat`, `dev`, `esha`, `retailer`, `admin`).
- `POST /api/v1/auth/logout`: Clears session cookie and invalidates session token.

### 5.2 Catalogue (`/api/v1/catalogue`)
- `GET /api/v1/catalogue/categories`: List all 12 grocery categories (Staples, Dairy, Snacks, Oils, Spices, Beverages, etc.).
- `GET /api/v1/catalogue/products`: List products with pagination (`page`, `limit`), text search (`q`), and category filtering (`category`).

### 5.3 Collective Cart (`/api/v1/cart`)
- `GET /api/v1/cart`: Fetch community group cart for current cycle, returning `my_items`, `community_items`, total amounts, and cutoff metadata.
- `PUT /api/v1/cart/items/{variant_id}`: Add or update quantity for an item. Returns `409 Conflict` if the cutoff deadline has passed.
- `DELETE /api/v1/cart/items/{variant_id}`: Remove item from cart.
- `POST /api/v1/cart/items:batch`: Atomic bulk update of multiple cart items.

### 5.4 Retailer Fulfillment (`/api/v1/retailer`)
- `GET /api/v1/retailer/orders`: Retrieve consolidated community bulk orders (`pending`, `accepted`, `packing`, `billed`, `completed`).
- `POST /api/v1/retailer/orders/{id}/accept`: Retailer acknowledges and locks order for packing.
- `POST /api/v1/retailer/orders/{id}/packing`: Update packed quantities per variant (enforcing $\text{packed} \le \text{requested}$).
- `POST /api/v1/retailer/orders/{id}/send-bill`: Finalizes order, triggers F7 bill-splitting algorithm, generates resident invoices, and unlocks bills.
- `GET /api/v1/retailer/inventory`: Query inventory levels with `low_stock` filtering and pagination.
- `POST /api/v1/retailer/inventory/inward`: Record inward shipment of stock.

### 5.5 Apartment Admin (`/api/v1/admin`)
- `GET /api/v1/admin/overview`: Summary metrics: total households, total orders, collection percentage, outstanding amount.
- `GET /api/v1/admin/invoices`: Paginated invoice list with `section=paid` or `section=unpaid` filtering.
- `POST /api/v1/admin/reminders`: Send payment reminder notification/SMS to unpaid residents (rate-limited to 1 per hour).
- `POST /api/v1/admin/deliveries/{invoice_id}/advance`: Advance delivery status from `at_gate` to `handed_over`.

### 5.6 Voice Assistant (`/api/v1/voice`)
- `POST /api/v1/voice/parse`: Accepts `{ "text": "do kilo sona masoori rice aur ek litre amul doodh" }`. Returns parsed items, extracted quantities, matched product IDs, confidence scores, and any clarification prompts.

### 5.7 Payments & Invoices (`/api/v1/invoices` & `/api/v1/webhooks`)
- `GET /api/v1/invoices`: List resident's invoices across cycles.
- `POST /api/v1/invoices/{id}/pay`: Initiate checkout session (returns Razorpay Order ID or mock transaction).
- `POST /api/v1/invoices/{id}/verify`: Verify payment signature and mark invoice `paid`.
- `POST /api/v1/webhooks/razorpay`: Idempotent webhook receiver verifying `X-Razorpay-Signature`.

---

## 6. Frontend UI/UX & Design Token System

### 6.1 Design Philosophy
The UI follows an accessible, high-contrast, Indian-fintech aesthetic:
- **Typography**: 
  - Headings: `DM Serif Display` (editorial warmth and dignity).
  - Body & UI: `DM Sans` (clean legibility at small sizes).
  - Devanagari: `Noto Sans Devanagari` (clear rendering of Hindi characters).
- **Color Palette (Strict Design System Tokens)**:
  - Background: `ice-50` (`#f8fafc`), Surface: `white` (`#ffffff`), Borders: `ice-200` (`#e2e8f0`).
  - Brand Primary (Teal): `teal-700` (`#0f766e`), Primary Hover: `teal-800` (`#115e59`).
  - Text: Primary `ink-800` (`#1e293b`), Muted `ink-500` (`#64748b`).
  - Accents: Forest green for savings, Amber for cutoff warnings, Red for unpaid alerts.
- **Zero Raw Hex Rule**: A custom linter (`apps/web/scripts/check-hex.mjs`) validates that 0 inline hex codes exist outside `globals.css`.

### 6.2 Key UI Components
- `MoneyText`: Standardized Indian currency display (`₹ 1,450.00`) with integer paise safety.
- `StatusPill`: Semantic badge component (`kind: "success" | "warning" | "error" | "neutral"`).
- `MonthTimeline`: Visual progress bar showing ordering phase: *Ordering Open* → *Cutoff Reached* → *Retailer Packing* → *Bill Split & Ready* → *Delivered*.
- `MicButton`: Animated microphone button triggering browser SpeechRecognition with live waveform animation.
- `EmptyState`: Standardized empty list fallback with illustration, title, description, and retry action.
- `Skeleton`: Shimmering placeholder components for Next.js Suspense loading boundaries.

---

## 7. Deployment & Infrastructure Setup

### 7.1 Unified Docker Deployment (Render / Cloud Run)
The application includes a root `Dockerfile` that packages both the FastAPI backend and Next.js frontend into a single container:
1. Installs Python 3.11 and Node.js 20.
2. Installs Python packages from `apps/api/requirements.txt`.
3. Installs frontend dependencies with `npm ci --include=dev` to ensure `@tailwindcss/postcss` is available during build.
4. Executes `npm run build` in `apps/web`.
5. Launches via `start.sh`:
   - Runs FastAPI on internal port `8000`.
   - Starts Next.js on the external `$PORT` (Render dynamic port).
   - Next.js proxies `/api/*` and `/docs` to `127.0.0.1:8000`.

### 7.2 Static Site + Separate Web Service Deployment
Alternatively, the repository supports decoupled deployment:
- **Backend (Render Web Service)**: Runs `uvicorn app.main:app` from `apps/api`.
- **Frontend (Render Static Site / Vercel)**:
  - `apps/web/next.config.ts` exports static HTML (`output: "export"`).
  - `apps/web/package.json` copies `out/` to `build/` and `dist/` upon completion.
  - `apps/web/lib/api.ts` includes a global browser fetch interceptor that dynamically routes all relative `/api/v1/*` requests to `https://pact-d3adlock.onrender.com` when running on remote domains.
  - Backend CORS is configured via `allow_origin_regex` to accept all `*.onrender.com` and `*.vercel.app` origins.

---

## 8. Step-by-Step Prompting Guide for Re-Building via ChatGPT

To re-build this entire application from scratch using ChatGPT or an AI code generation agent, follow this sequential prompt sequence:

### Prompt 1: Core Domain Models & Fair Bill Splitting Engine
> "Generate a standalone Python module `split.py` for a collective grocery commerce app called PACT. Implement the F7 fair bill splitting algorithm: given a list of resident requested cart items, retailer packed items (with possible short-packs), item unit prices, and a fixed delivery charge, compute each resident's individual bill in integer paise. Pass through product-level discounts proportionally. Ensure the sum of resident bills exactly matches the total retailer charge with 0 paise discrepancy. Include full pytest test coverage with edge cases."

### Prompt 2: FastAPI Backend Core & Cutoff Clock
> "Create a FastAPI backend skeleton for PACT. Setup `Settings` via `pydantic-settings` with cutoff configuration for the 22nd of each month at 5:27 PM IST (`Asia/Kolkata`). Implement a `clock.py` module to evaluate whether the current ordering cycle is OPEN or LOCKED. Implement `app/core/deps.py` with FastAPI dependency injection for four roles: customer, retailer, admin, and platform_admin using HMAC-SHA256 session tokens. Add a unified C6 JSON error envelope."

### Prompt 3: Voice Ordering NLP Subsystem
> "Build a Python voice order parsing pipeline in `app/modules/voice/` for Indian grocery ordering. Support Hindi in Devanagari, English, and Hinglish. Extract quantities (handling words like 'ek', 'do', 'aadha', 'paav', 'dedh', 'kilo', 'litre', 'packet') and map them to a 60-item grocery catalogue using fuzzy matching. If an item is ambiguous, return structured clarification questions."

### Prompt 4: Retailer & Cart API Routers
> "Implement FastAPI routers for the shared community cart (`/api/v1/cart`) and retailer operations (`/api/v1/retailer`). The cart must allow resident updates when the cycle is open and return 409 Conflict when locked. The retailer router must handle accepting orders, submitting packed quantities, and generating bills. Use a clean service layer pattern separating routes from business logic."

### Prompt 5: Next.js 16 Frontend Setup & Design Tokens
> "Scaffold a Next.js 16 App Router project with TypeScript and Tailwind CSS v4. Create an atomic UI component library: `MoneyText`, `StatusPill`, `MonthTimeline`, `MicButton`, `TopBar`, and `EmptyState`. Enforce zero inline hex colors outside `globals.css`. Set up an `apiClient` wrapper in `lib/api.ts` with error handling and environment-aware backend URL resolution."

### Prompt 6: Role Dashboards & Onboarding
> "Build the frontend pages in Next.js: `/` (Landing & Onboarding portal with demo persona switcher), `/customer/shop` (catalogue with category filters and loading skeletons), `/customer/list` (community group cart with cutoff timer), `/customer/speak` (voice ordering interface with mic button), `/retailer/orders` (packing stepper with short-pack controls), and `/admin` (collection overview with one-click payment reminders)."

### Prompt 7: Capacitor Mobile APK & Dockerfile
> "Configure Capacitor 7 for the Next.js frontend to build native Android APKs. Write a unified multi-stage `Dockerfile` and `start.sh` entrypoint that runs FastAPI on port 8000 and Next.js on the public port with automatic internal proxying."
