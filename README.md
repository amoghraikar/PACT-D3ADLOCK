<div align="center">

<img src="apps/web/public/brand/pact-logo-lockup.png" alt="PACT" width="320">

# PACT

**Collective Commerce. Connected Communities.**

One building · one shared monthly cart · one bulk order · one bill, split fairly.

*The build manual for AI coding agents: product spec, locked decisions, design system and 27 step-by-step prompts in a single file.*

</div>

---

## Start here

This file is the **only** document an agent needs to build PACT. It is organised so that no session ever has to load all of it.

| Part | What is inside | Who reads it, when |
|---|---|---|
| **1 · Core** | What PACT is, the hard rules, stack, conventions, agent protocol | Every session, in full |
| **2 · Reference** | Decisions `D` · data model `M` · state machines `S` · features `F1–F14` · design `U1–U9` · out of scope `X` · golden scenario `G` | Only the sections a prompt names |
| **3 · Build prompts** | `P00 → P26`, one agent session each | One per session, in order |
| **4 · Build tracker** | Progress checklist, run and deploy notes | Start and end of every session |

### If you are the human driving the build

1. Make this folder the root of a new repository. Keep `README.md`, `design/` and `apps/web/public/brand/` (the logo files are already there).
2. Open `design/ui-reference.html` in a browser once, to see what you are building.
3. Open a **fresh** agent session. Copy one prompt block from Part 3, paste it, let the agent finish.
4. Run that prompt's **Done when** checks yourself. Commit. Move to the next prompt.
5. Keep the order. Each prompt lists what it `Needs`.
6. If your tool has a rules file (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, Antigravity rules), put one line in it: *"Before any task, read README.md Part 1 and follow it."*
7. Using a chat-only AI with no file access? Paste Part 1, the sections the prompt names, then the prompt.

### Why it is shaped this way

- **Small context per session.** A session costs Part 1 + a few reference sections + its own prompt, never the whole manual.
- **No repeated research.** Every open question in the original specification has an answer in `D`. Agents build; they do not re-decide.
- **One shared example.** The golden scenario `G` gives every prompt the same people, prices and expected numbers, so each stage can be checked against the last.

### Routes through the build

| Goal | Prompts |
|---|---|
| Full monthly loop, text mode (demo-ready) | `P00 – P19`, then `P26` |
| Add voice ordering and voice sign-in | `P20 – P22` |
| Add Kafka and OpenSearch on Aiven | `P23 – P24` |
| Harden before real users | `P25` |

---

# Part 1 · Core

> Read all of Part 1 in every session. It is short on purpose.

## C1 · PACT in sixty seconds

PACT lets the residents of one apartment community buy groceries **together, once a month**.

Residents add what they need to a shared community cart from one unified catalogue that never shows store names. On the 25th, PACT sends one consolidated order to the community's retailer. The retailer accepts it, packs it, applies discounts and issues one final bill. PACT splits that bill, Splitwise-style, into one invoice per resident. Residents pay through a payment gateway, and the community admin delivers to everyone whose payment is confirmed.

It is not a conventional online grocery store: there is no instant checkout, and no per-store shopping.

## C2 · The monthly loop

```
  1st ─────────── 24th │ 25th             │ after the 25th                │ after the bill
  RESIDENTS            │ PACT             │ RETAILER                      │ RESIDENTS, then ADMIN
  add, edit, remove    │ locks the cart,  │ accept → pack actual          │ each pays own bill
  their own items      │ submits ONE      │ quantities → discounts →      │ (gateway-verified);
  (typing or voice)    │ bulk order       │ ONE final bill; PACT splits   │ admin reminds unpaid,
                       │                  │ it into per-resident bills    │ delivers to paid
```

Three records carry this, and they are never collapsed into one:
**customer contribution** (editable lines) → **community cart** (one per community per month) → **bulk order** (immutable snapshot taken at cutoff).

## C3 · Roles

| Role | Does | Sees | Never sees |
|---|---|---|---|
| `customer` | Signs in (typing or voice), browses, edits own contribution, reviews own bill, pays | Own lines, bill, payment and delivery status; anonymous community totals | Store identity; any other resident's lines or bills |
| `retailer` | Manages own inventory; accepts, packs, discounts and bills community orders; tracks collection | Own listings, stock, orders, bills; per-customer packing breakdown (name + flat) | Any other retailer's data; customer phone numbers |
| `community_admin` | Monitors the community order and payments, sends reminders, runs delivery | Own community's residents, bill totals, payment and delivery status, packed list for handover | Other communities; retailer inventory and pricing internals |
| `platform_admin` ＋ | Creates communities, activates and assigns stores, approves new-product requests | What those tasks need | — |

`＋` marks anything added by this manual beyond the original specification.

## C4 · Hard rules

Break one of these and the build is wrong, whatever else works.

| # | Rule |
|---|---|
| **R1** | **Identity comes from the session.** Never trust a `customer_id`, `retailer_id` or `community_id` sent by the browser. |
| **R2** | **Tenant isolation.** Every retailer query is filtered by the session's store; every community query by the session's membership. Someone else's record answers `404`. |
| **R3** | **Stores are invisible to customers.** No customer-facing response or screen contains a store's id, name, address or SKU. |
| **R4** | **Residents are private from each other.** A customer receives only their own lines and bills, plus anonymous totals. |
| **R5** | **Ownership is never lost.** Every cart line, order line and invoice line carries its `customer_id`. |
| **R6** | **Three records.** Contribution → community cart → bulk order. `requested_qty` is frozen at cutoff. |
| **R7** | **Bill what was packed**, not what was requested. |
| **R8** | **Reconciliation.** Sum of customer invoice totals = retailer bill total, asserted inside the finalisation transaction. |
| **R9** | **Money is integer paise.** No floats, anywhere. |
| **R10** | **Payment truth is server-side.** An invoice becomes `paid` only from a verified gateway event. Idempotent on the gateway event id. Nobody can mark a bill paid by hand. |
| **R11** | **Delivery only for paid bills.** Every delivery status change records who and when. |
| **R12** | **PostgreSQL is the source of truth.** Kafka and OpenSearch are projections, fed by an outbox written in the same transaction. |
| **R13** | **Critical changes are transactional**, with row locks: order submission, stock reservation, bill finalisation, payment update. |
| **R14** | **Audit** inventory changes, bill adjustments, payment transitions, notifications and delivery status. |
| **R15** | **Voice never guesses.** Ambiguous → ask. Nothing enters the cart unconfirmed. Typing is always available. Voice is not proof of identity. |
| **R16** | **Stay in scope.** Nothing from `X`. Dashboards show real records, never invented numbers. Retailers list against the central catalogue; they do not create products. |

## C5 · Stack and layout

| Layer | Choice | Notes |
|---|---|---|
| Web | Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · lucide-react | One app, four workspaces: `/customer` `/retailer` `/admin` `/platform` |
| API | Python 3.12 · FastAPI · SQLAlchemy 2 (sync, psycopg 3) · Alembic · Pydantic v2 | Sync sessions keep transactions and row locks simple |
| Database | PostgreSQL 16 (Aiven in production) | Source of truth |
| Events | Outbox table → inline relay (`P03`) → Apache Kafka on Aiven (`P23`) | Same handlers on both transports |
| Search | PostgreSQL trigram (`P08`) → OpenSearch on Aiven (`P24`) | Projection only |
| Payments | `PaymentGateway` interface: Mock (dev) · Razorpay test mode | See `D8` |
| Voice | Browser Web Speech API + server-side interpreter | See `D15` |
| Tests | pytest on real PostgreSQL · hypothesis · Playwright · axe | |
| Deploy | Vercel (web) · Render (API, worker, cron) · Aiven | |

```
pact/
├─ README.md                  ← this manual (agents edit Part 4 only)
├─ design/ui-reference.html   ← static picture of the intended look (view it, do not parse it)
├─ Makefile                   ← dev · api · web · migrate · seed · test · lint · demo
├─ docker-compose.yml         ← postgres (+ kafka in P23, opensearch in P24)
├─ apps/api/
│  ├─ app/core/               ← config · db · clock · security · events · audit · errors
│  ├─ app/models/             ← SQLAlchemy models, one file per M block
│  ├─ app/modules/<feature>/  ← router.py · service.py · schemas.py
│  ├─ app/workers/            ← outbox relay · cycle tick · consumer
│  ├─ migrations/             ← Alembic
│  └─ tests/                  ← pytest · factories.py · golden fixture
└─ apps/web/
   ├─ app/(auth)/login
   ├─ app/customer/…  app/retailer/…  app/admin/…  app/platform/…
   ├─ components/ui/          ← the UI kit (U5): the only place visual styles live
   ├─ lib/                    ← api.ts · format.ts · copy/en.ts · useSpeech.ts
   ├─ public/brand/           ← pact-logo.png · pact-logo-lockup.png · pact-mark.png
   └─ e2e/                    ← Playwright
```

Feature modules: `auth` `platform` `catalogue` `inventory` `cart` `orders` `billing` `payments` `notifications` `dashboard` `admin` `voice`.

## C6 · Conventions

- **Money:** `*_paise BIGINT`. Format only at the edge: `₹1,23,456.50`, Indian grouping, drop `.00`.
- **Time:** store UTC `timestamptz`; business rules run in `Asia/Kolkata`; every "now" comes from `core/clock.py` so tests can move the clock.
- **Ids:** UUID primary keys. Human-facing numbers (`order_no`, `invoice_no`) are separate columns.
- **API:** REST under `/api/v1`, JSON, `snake_case`. Errors use one envelope: `{"error": {"code": "CART_LOCKED", "message": "…"}}`.
- **Status codes:** `401` not signed in · `403` wrong role · `404` not found or not yours · `409` wrong state · `422` invalid input.
- **Same origin:** the web app calls the API through a Next.js `/api/*` rewrite, so the session is an httpOnly cookie.
- **Backend shape:** routers are thin; a service function owns one transaction; rows being transitioned are locked with `SELECT … FOR UPDATE`.
- **Events:** call `emit_event()` inside the transaction; handlers are idempotent.
- **Tests:** real PostgreSQL, never SQLite. Each prompt adds tests for the rules it implements.
- **Config:** environment variables only, each documented in `.env.example`.
- **UI:** built only from the kit in `components/ui`, in the language of `U7`, to the bar in `U9`. All strings live in `lib/copy/en.ts`.

## C7 · Agent protocol

1. Read Part 1 in full. Then read **only** the sections your prompt lists. Do not read the rest of Parts 2 and 3.
2. Open Part 4. Confirm your prompt's `Needs` are ticked. Skim their notes for deviations.
3. Look only at the code you will touch. Extend existing patterns. Never re-scaffold, rename or restyle what already exists.
4. Build exactly your prompt's scope. If something outside it is missing, leave `TODO(Pxx)` and continue.
5. `D` decisions are locked. If one blocks you or looks wrong, **stop and ask**. Do not choose silently.
6. Build nothing listed in `X`.
7. Write the tests your prompt lists. Run `make test` and `make lint` until both pass.
8. Finish: tick your row in Part 4, add at most two lines of notes (deviations, new env vars, new commands), then reply with *what was built · how to verify it · anything deferred*.

---

# Part 2 · Reference

> Read only what your prompt names.

## D · Decisions

The original specification left eleven questions open. They are answered here so the build never stalls. To change one, edit this table first, then tell the agent.

| # | Open question | Answer for v1 |
|---|---|---|
| **D1** | Which retailer serves a community? | One assigned store per community (`communities.assigned_retailer_id`), snapshotted onto each monthly cart. Hidden from customers. |
| **D2** | Does PACT NOW (urgent individual orders) exist? | No. Not built. |
| **D3** | One or many retailers per community order? | Exactly one, so exactly one bill. |
| **D4** | Monthly cycle boundaries? | Calendar month in `Asia/Kolkata`. Opens on the 1st at 00:00. Locks on the 25th at 00:00, so the last edit is the 24th at 23:59:59. No late additions. The next cart opens on the next 1st. Env: `CYCLE_CUTOFF_DAY`, `BUSINESS_TZ`. |
| **D5** | What can the retailer do with an incoming order? | Accept all, or reject all with a reason. No counter-proposal. Shortages are handled at packing. |
| **D6** | Packing adjustments? | Per customer line, `0 ≤ packed ≤ requested`. No substitutions and no approval step: residents pay only for what was packed. |
| **D7** | Discounts, tax, charges, rounding? | Prices are GST-inclusive; a tax column exists and is 0. Order of operations: product discount → overall discount (proportional by value) → delivery charge (equal split). Largest-remainder rounding in paise. Details in `F7`. |
| **D8** | Payment gateway and settlement? | Razorpay **test mode** behind a `PaymentGateway` interface; `MockGateway` is the dev default. No split settlement; dashboards say "Settlement: not available in test mode". |
| **D9** | Who qualifies for delivery? | Only invoices in `paid`. No partial payment, no exception path. |
| **D10** | Admin model? | One or more `community_admin` per community, each scoped to it, plus a global `platform_admin`. |
| **D11** | GSTIN policy? | Optional. If entered it must pass format and checksum, and is labelled "Format checked · not government-verified". |

Questions the specification did not raise, but a build cannot avoid ＋:

| # | Question | Answer for v1 |
|---|---|---|
| **D12** | Sign-in and onboarding? | Phone + one-time code for every role. A new resident joins with a building code, name and flat. A new retailer registers a store, which stays `pending` until a platform admin activates it. One role per user. |
| **D13** | What does a customer's catalogue contain, at what price? | Central products that the community's assigned store lists as `active`. Stock level does not hide a product, because this is a pre-order. The listing's selling price is shown as an estimate ("About ₹300"). |
| **D14** | When is the price final? | The unit price is snapshotted at cutoff. The retailer may change it while billing, never above MRP. |
| **D15** | Voice technology? | Browser Web Speech API (`en-IN`, `hi-IN`) for speech-to-text and prompts; a deterministic server-side interpreter (aliases + fuzzy match). No LLM is required. |
| **D16** | Notification channel? | In-app notifications always. Web Push is an optional stretch. |
| **D17** | Refunds and cancellations? | The states exist in the schema. No refund or cancel flow in v1. Residents cannot cancel after lock. |
| **D18** | When does stock move? | Reserved on acceptance, deducted on bill finalisation. |

## M · Data model

Notation: `✱` unique · `→` foreign key · `?` nullable · `＋` added beyond the specification's twenty tables. All tables have `created_at` and `updated_at`. All `*_paise` columns are `BIGINT` with `CHECK >= 0`.

### M1 · Identity and tenancy

```
users                  id · phone✱ · name · role(customer|retailer|community_admin|platform_admin)? · language(en|hi)
otp_challenges ＋       id · phone · code_hash · expires_at · attempts · consumed_at?
communities            id · name · code✱ (short, used in order numbers) · join_code✱ · address · assigned_retailer_id?→retailers
community_memberships  id · community_id→ · user_id→✱ · unit_label · role(member|admin)
retailers              id · owner_user_id→users✱ · store_name · address · gstin? · gstin_status(none|format_valid) · status(pending|active|suspended)
```

`users.role` is null until onboarding is finished.

### M2 · Catalogue

```
categories         id · slug✱ · name · sort_order                                  (exactly the 12 in F2)
products           id · category_id→ · name · brand · image_url · is_active        UNIQUE(lower(name), lower(brand))
product_variants   id · product_id→ · label ("5 kg") · pack_size · pack_unit(g|kg|ml|l|pc) · base_qty (g, ml or pieces)
                                                                                    UNIQUE(product_id, pack_size, pack_unit)
product_aliases ＋  id · product_id→ · alias · language(en|hi)                      UNIQUE(product_id, lower(alias))
product_requests ＋ id · retailer_id→ · category_id→ · name · brand · variant_label · note?
                   · status(pending|approved|rejected) · resolved_variant_id? · resolved_by? · resolved_at?
```

### M3 · Inventory

```
retailer_inventory  id · retailer_id→ · variant_id→ · sku? · mrp_paise · selling_price_paise
                    · stock_qty · reserved_qty · min_stock_threshold · availability(active|unavailable|inactive)
                    UNIQUE(retailer_id, variant_id) · CHECK selling_price_paise <= mrp_paise · CHECK 0 <= reserved_qty <= stock_qty
stock_movements     id · inventory_id→ · stock_delta · reserved_delta
                    · reason(replenishment|manual_adjustment|reservation|release|packing_sale|cancellation)
                    · order_id? · actor_user_id · note?                             (append-only)
```

Listings are never hard-deleted; "remove" sets `inactive`.

### M4 · Cart and order

```
monthly_community_carts  id · community_id→ · cycle_month (date, 1st of month) · retailer_id→ (snapshot)
                         · status · opens_at · locks_at                             UNIQUE(community_id, cycle_month)
customer_cart_items      id · cart_id→ · customer_id→users · variant_id→ · quantity (packs, > 0) · source(text|voice)
                                                                                    UNIQUE(cart_id, customer_id, variant_id)
community_orders         id · cart_id→✱ · community_id→ · retailer_id→ · order_no✱ · status
                         · submitted_at · accepted_at? · rejected_reason? · bill_draft (jsonb)? · billed_at? · completed_at?
customer_order_items     id · order_id→ · customer_id→ · variant_id→ · requested_qty (immutable) · packed_qty?
                         · unit_price_paise (snapshot at cutoff) · mrp_paise
                         UNIQUE(order_id, customer_id, variant_id) · CHECK packed_qty <= requested_qty
```

### M5 · Billing

```
retailer_bills        id · order_id→✱ · gross_paise · product_discount_paise · overall_discount_paise
                      · delivery_charge_paise · tax_paise (0 in v1) · total_paise · finalised_by · finalised_at
retailer_bill_lines ＋ id · bill_id→ · variant_id→ · packed_qty_total · unit_price_paise (final, <= MRP)
                      · line_discount_paise · line_total_paise                      UNIQUE(bill_id, variant_id)
customer_invoices     id · bill_id→ · order_id→ · customer_id→ · invoice_no✱ · subtotal_paise
                      · overall_discount_share_paise · delivery_share_paise · rounding_adjustment_paise
                      · total_paise · status · paid_at?                             UNIQUE(bill_id, customer_id)
invoice_items         id · invoice_id→ · variant_id→ · product_name · variant_label (snapshots)
                      · requested_qty · packed_qty · unit_price_paise · line_discount_paise · line_total_paise
```

### M6 · Payments

```
payments        id · invoice_id→ · gateway(mock|razorpay) · gateway_order_id✱ · gateway_payment_id?
                · amount_paise · status(created|succeeded|failed|needs_refund)      UNIQUE(invoice_id) WHERE status = 'succeeded'
payment_events  id · payment_id? · gateway · gateway_event_id✱ · event_type · signature_valid
                · payload (jsonb) · received_at · processed_at?                     (append-only; the UNIQUE is the idempotency key)
```

### M7 · Operations

```
notifications        id · user_id→ · type · title · body · data (jsonb, deep link) · status(queued|sent|failed)
                     · read_at? · sent_by?
delivery_records     id · invoice_id→ · community_id→ · status(paid|ready_for_distribution|out_for_delivery|delivered)
                     · changed_by? (null = system) · changed_at                     (append-only; current = latest row)
outbox_events ＋      id · type · aggregate_id · payload (jsonb) · published_at?
audit_log ＋          id · actor_user_id? · action · entity · entity_id · before (jsonb)? · after (jsonb)? · at
processed_events ＋   consumer · event_id                                           UNIQUE(consumer, event_id)   (created in P23)
push_subscriptions ＋ id · user_id→ · endpoint✱ · keys (jsonb)                      (only if the Web Push stretch is built)
```

## S · State machines

```
cart      open ──(25th 00:00 IST)──▶ locked ──▶ submitted            locked ──▶ closed_empty  (no items)
order     submitted ──▶ accepted ──▶ packing ──▶ billed ──▶ completed          submitted ──▶ rejected
invoice   bill_generated ──▶ payment_pending ──▶ paid ──▶ refund_pending ──▶ refunded
                             payment_pending ──▶ payment_failed ──▶ payment_pending   (retry)
          bill_generated ──▶ void                                               (total is 0)
payment   created ──▶ succeeded | failed            succeeded on an already-paid invoice ──▶ needs_refund
delivery  paid ──▶ ready_for_distribution ──▶ out_for_delivery ──▶ delivered
listing   active ⇄ unavailable ⇄ inactive
```

| Transition | Who may trigger it |
|---|---|
| cart `open → locked → submitted` | The cycle tick (system) only |
| order `→ accepted / rejected / packing / billed` | The owning retailer |
| order `→ completed` | System, when every non-void invoice is `paid` |
| invoice `→ payment_pending` | The owning customer, by pressing Pay |
| invoice `→ paid / payment_failed` | A verified gateway event only |
| delivery `paid` | System, when the invoice becomes `paid` |
| delivery `→ ready / out / delivered` | A community admin of that community, one step at a time |

Any other transition answers `409`. "Unpaid" everywhere means invoice status in `bill_generated`, `payment_pending`, `payment_failed`.

## F1 · Sign-in and ordering mode

- **One mechanism for everyone:** phone number + 6-digit one-time code.
- **Endpoints:** `POST /auth/otp/request {phone}` (always answers the same, whether or not the phone is known) · `POST /auth/otp/verify {phone, code}` (sets the session cookie) · `GET /auth/me` · `POST /auth/logout` · `POST /onboarding/resident {join_code, name, unit_label}` · `POST /onboarding/retailer {store_name, address, gstin?}`.
- **Code rules:** stored hashed · expires in 5 minutes · 5 attempts · at most 3 requests per phone per 10 minutes. With `OTP_MODE=dev` the code is written to the server log and `000000` is accepted.
- **Session:** signed JWT in an httpOnly, Secure, SameSite=Lax cookie, 7 days. It carries the user id only; role and tenant are looked up per request.
- **First sign-in:** the user chooses *I live here* (building code → `customer`) or *I run a store* (registration → `retailer`, pending). `community_admin` and `platform_admin` are granted by a platform admin or the seed.
- **Sign-in screen:** a `Type | Speak` toggle. The person chooses how to go through sign-in.
- **Voice sign-in:** one question at a time, spoken and written: phone number → read back and confirm → send code → enter or say the code → done. Voice only fills the form; the server check is identical. Never ask for a password. Never read the code aloud. Any speech failure falls back to typing with captured values kept.
- **Ordering mode:** after sign-in, a customer chooses *Type & tap* or *Speak*. This choice is separate from the sign-in mode and can be switched at any time.
- **Landing:** `customer → /customer` · `retailer → /retailer` · `community_admin → /admin` · `platform_admin → /platform`.

## F2 · Unified catalogue

The twelve categories, in this order:

| 1 Rice & Grains | 2 Flours & Atta | 3 Dal (Lentils) & Pulses | 4 Spices |
|---|---|---|---|
| **5** Sugar & Jaggery | **6** Cooking Oils & Ghee | **7** Sauces, Pickles & Spreads | **8** Dry Fruits |
| **9** Fruits & Nuts | **10** Beverages | **11** Snacks | **12** Breakfast & Cereals |

- **One card per central product.** Never one card per store. Product identity is standardised: name, brand, category, image, variants.
- **Variants are options on the card**, not duplicates: 1 kg and 5 kg are two choices of the same product.
- **What a customer sees (`D13`):** products with at least one variant listed `active` by their community's assigned store. Zero stock does not hide a product.
- **Price:** that listing's selling price, shown as an estimate. MRP is shown struck through when higher.
- **Find things two ways:** category browsing and search across name, brand and aliases (English, Hindi in Latin letters, Hindi in Devanagari).
- **Endpoints:** `GET /catalogue/categories` · `GET /catalogue/products?category=&q=&cursor=` · `GET /catalogue/products/{id}`.
- **R3 in practice:** response objects are built from an explicit allow-list. No store id, name, address or SKU can appear.
- **Images:** `products.image_url`. The seed ships placeholders at `public/products/<slug>.svg`; real photographs replace them by filename later.

## F3 · Voice ordering

Speech-to-text and interpretation are two separate steps: the browser produces text; the server turns text into catalogue items.

**Flow:** tap the mic and speak → transcript appears live and stays editable → `POST /voice/interpret` → review list → answer any clarifying question, one at a time → confirm → `POST /cart/items:batch` with `source: "voice"`. Nothing reaches the cart before the confirm step.

**Languages:** English (`en-IN`) and Hindi (`hi-IN`). Kannada and others later.

**Fallback:** unsupported browser, denied microphone, recognition or network error → a plain message, and the same screen continues with typing. Nothing heard or typed is lost.

**Normalisation tables** (extend freely; keep them as data, not code):

| Kind | Examples |
|---|---|
| Numbers | one/ek/एक=1 · two/do/दो=2 · three/teen/तीन=3 · four/chaar/चार=4 · five/paanch/पाँच=5 · six/chhe/छह=6 · seven/saat/सात=7 · eight/aath/आठ=8 · nine/nau/नौ=9 · ten/das/दस=10 · Latin and Devanagari digits |
| Fractions | half/aadha/आधा=0.5 · quarter/paav/पाव=0.25 · one and a half/dedh/डेढ़=1.5 · two and a half/dhai/ढाई=2.5 |
| Units | kg, kilo, kilogram, किलो · g, gm, gram, ग्राम · l, litre, liter, लीटर · ml, मिलीलीटर · packet, pack, piece, पैकेट |
| Joiners | and · aur/और · plus · also · commas |
| Fillers to drop | I need · please add · mujhe chahiye · chahiye · de do |

**Matching** (only among products visible in the caller's catalogue):

1. Exact alias match after normalisation. One product → `matched`. Several → `ambiguous`.
2. Otherwise trigram similarity above a threshold. One clear winner → `matched` with `confidence: "low"`. Otherwise `ambiguous`, or `unmatched` if nothing is close.

**Variant rule** (convert the spoken amount to base units first):

1. A listed variant whose pack equals the amount → quantity 1.
2. Otherwise the largest listed variant whose pack divides the amount exactly → quantity *n* (at most 20).
3. Otherwise `ambiguous`, offering the nearest pack options.

No quantity, no unit, or a unit that does not fit the product ("2 litres of rice") → `ambiguous` with a question. Never guess.

**Response shape:**

```json
{
  "language": "en",
  "items": [
    { "heard": "5 kg rice", "status": "matched", "confidence": "high",
      "product_id": "…", "variant_id": "…", "name": "Sona Masoori Rice", "variant_label": "5 kg", "quantity": 1 },
    { "heard": "2 kg atta", "status": "ambiguous", "question": "Which atta would you like?",
      "options": [ { "product_id": "…", "variant_id": "…", "name": "…", "variant_label": "1 kg", "quantity": 2 } ] },
    { "heard": "some biscuits", "status": "unmatched",
      "question": "I couldn't find \"biscuits\". Try another name, or look in the shop." }
  ]
}
```

## F4 · Shared cart and monthly cycle

- **One cart per community per month.** Communities never share a cart or an order.
- **Created by the cycle tick** when a month opens, snapshotting the community's assigned store.
- **Customer writes** are allowed only on the caller's own lines, only for variants in their catalogue, only while the cart is `open` and the clock is before `locks_at`. Otherwise `409 CART_LOCKED`.
- **Endpoints:** `GET /cart` · `PUT /cart/items/{variant_id} {quantity}` (upsert; 0 removes) · `DELETE /cart/items/{variant_id}` · `POST /cart/items:batch` (all or nothing) · `GET /orders/current`.

```json
{
  "cycle_month": "2026-11", "status": "open", "locks_at": "2026-11-24T18:30:00Z",
  "my_items": [ { "variant_id": "…", "name": "Sona Masoori Rice", "variant_label": "5 kg",
                  "quantity": 1, "est_unit_price_paise": 30000, "est_line_paise": 30000 } ],
  "my_est_total_paise": 80000,
  "community": { "participants": 4,
                 "items": [ { "name": "Sona Masoori Rice", "variant_label": "5 kg", "total_quantity": 6, "total_base": "30 kg" } ] }
}
```

The `community` block is anonymous: totals and a head-count, never names or per-resident lines.

**Cutoff** (cycle tick, every 5 minutes, idempotent). For each `open` cart with `locks_at <= now`, in one transaction:

1. Lock the cart row; set `locked`.
2. No items → `closed_empty`; stop.
3. Create the `community_orders` row (`submitted`).
4. Copy every cart line into `customer_order_items` with `requested_qty` and the listing's current price and MRP.
5. Set the cart `submitted`; emit `order.submitted`.

`UNIQUE(cart_id)` on orders makes a repeated or concurrent tick harmless. A line whose listing has since been deactivated is still copied; the retailer short-packs it.

## F5 · Retailer inventory

Each store has a private workspace using the same twelve categories.

| Field | Rule |
|---|---|
| Product identity, category, image | Come from the central catalogue. Not editable by the store. |
| SKU / store product code | Optional, store-specific. |
| MRP | Store-maintained. |
| Store selling price | Editable. Never above MRP. |
| Stock quantity | Editable through stock adjustments only. Never below 0 or below reserved. |
| Minimum stock threshold | Editable. Drives low-stock alerts. |
| Unit / variant | From the central variant. |
| Availability | `active`, `unavailable` or `inactive`. |

- **Add a listing:** choose category → search the central catalogue → choose a variant → enter store details. A second listing for the same variant answers `409`.
- **Product not in the catalogue:** submit a product request. A platform admin approves it (creating the product or mapping it to an existing one) or rejects it. Stores never create central products.
- **Every stock change** writes a `stock_movements` row in the same transaction.
- **Low stock** means `stock_qty − reserved_qty < min_stock_threshold`. Emit `inventory.low_stock` once per downward crossing.
- **Endpoints:** `GET /retailer/inventory?category=&q=&availability=&low_stock=` · `GET /retailer/catalogue/search?q=&category=` · `POST /retailer/inventory` · `PATCH /retailer/inventory/{id}` · `POST /retailer/inventory/{id}/stock {delta, reason, note?}` · `GET /retailer/inventory/{id}/movements` · `POST|GET /retailer/product-requests`.
- **Platform endpoints:** `GET /platform/retailers` · `POST /platform/retailers/{id}/activate` · `POST /platform/communities/{id}/assign-retailer` · `GET /platform/product-requests` · `POST /platform/product-requests/{id}/approve|reject`.

## F6 · Retailer order processing

1. **Review** (`submitted`): totals per variant, and a per-customer breakdown showing name and flat only.
2. **Accept** → `accepted`: reserve `min(requested total, stock − reserved)` per variant. Or **Reject** with a reason → `rejected`; residents and admin are notified and nothing is billed.
3. **Pack** → `packing`: set `packed_qty` per customer line, defaulting to the requested quantity. Short and unavailable lines stay visible.
4. **Price and discount** (draft bill): final unit price per variant (defaults to the cutoff snapshot, never above MRP), optional product-level discount, optional overall discount, optional delivery charge.
5. **Preview:** the draft bill and the per-customer split, computed by `F7`, not saved.
6. **Finalise** → `billed`, in one transaction: lock the order · check stock covers packed totals · save bill and bill lines · run `F7` · save invoices and items (zero-total invoices are `void`) · assert `R8` · deduct stock and release unused reservations with movements · emit `bill.finalised` and one `invoice.created` per invoice · audit.

After finalisation the bill is read-only.

**Endpoints:** `GET /retailer/orders?status=` · `GET /retailer/orders/{id}` · `POST …/accept` · `POST …/reject {reason}` · `PUT …/packing [{order_item_id, packed_qty}]` · `PUT …/bill-draft {lines:[{variant_id, unit_price_paise, discount_paise}], overall_discount_paise, delivery_charge_paise}` · `GET …/bill-preview` · `POST …/finalise`.

## F7 · Bill splitting

A pure function with no database access, at `app/modules/billing/split.py`. All amounts are integer paise.

**`allocate(total, weights)`** shares `total` in proportion to `weights` using largest remainder: give each `floor(total × wᵢ / Σw)`, then hand out the leftover paise one at a time to the largest fractional remainders. Ties go to the lower `customer_id`. The result always sums to `total`.

**Steps**

1. Line gross = `packed_qty × final unit price`, per customer line.
2. Product discount `Dᵥ` on a variant: `allocate(Dᵥ, packed quantities of that variant's lines)` → each line's `line_discount`.
3. Customer subtotal = Σ (`gross − line_discount`).
4. Overall discount `O`: `allocate(O, subtotals)`.
5. Delivery charge `C`: `allocate(C, 1 for each customer whose subtotal > 0)`.
6. Invoice total = `subtotal − overall share + delivery share`. A subtotal of 0 gives a `void` invoice of 0.
7. Bill total = `Σ gross − Σ Dᵥ − O + C`. **Assert Σ invoice totals = bill total.** If not, raise and roll back.

Rule of thumb: compute every amount **once, at bill level**, then allocate it down. Never compute the same discount independently at both levels.

**Validation:** `Dᵥ ≤` that variant's gross · `O ≤ Σ subtotals` · unit price `≤` MRP · nothing negative.

**`rounding_adjustment_paise`** is informational: the net leftover paise an invoice received in steps 2, 4 and 5 (negative for extra discount, positive for extra charge). The share columns already include it.

**Worked examples** (all must be tests):

| Case | Subtotals | Discount / charge | Shares | Invoice totals | Bill |
|---|---|---|---|---|---|
| Specification example | ₹800 · ₹600 · ₹400 · ₹700 | ₹250 overall | ₹80 · ₹60 · ₹40 · ₹70 | ₹720 · ₹540 · ₹360 · ₹630 | ₹2,250 |
| Short-pack (one ₹100 line packed 0) | ₹800 · ₹600 · ₹400 · ₹600 | ₹250 overall | ₹83.33 · ₹62.50 · ₹41.67 · ₹62.50 | ₹716.67 · ₹537.50 · ₹358.33 · ₹537.50 | ₹2,150 |
| Even three-way | ₹100 · ₹100 · ₹100 | ₹100 overall | ₹33.34 · ₹33.33 · ₹33.33 | ₹66.66 · ₹66.67 · ₹66.67 | ₹200 |
| Product discount | one pack each, three customers | ₹1.00 on that product | ₹0.34 · ₹0.33 · ₹0.33 | — | — |
| Delivery charge | three customers | ₹50 delivery | ₹16.67 · ₹16.67 · ₹16.66 | — | — |

## F8 · Payments

1. **Pay.** `POST /invoices/{id}/pay`: the caller must own the invoice and it must be unpaid. The server creates a gateway order for exactly `total_paise`, inserts a `payments` row (`created`), sets the invoice `payment_pending`, and returns checkout parameters.
2. **Checkout.** The browser opens the gateway checkout (Razorpay Checkout, or the mock page in dev).
3. **Webhook.** `POST /webhooks/payments/{gateway}` — unauthenticated, verified by signature over the raw body:
   - Bad signature → `400`, nothing changes.
   - Insert into `payment_events`. A duplicate `gateway_event_id` → `200`, nothing else happens.
   - In one transaction with row locks: the amount must equal the invoice total → payment `succeeded`, invoice `paid` with `paid_at`, first delivery record (`paid`), order `completed` if it was the last unpaid invoice, emit `payment.succeeded`.
   - Failure event → payment `failed`, invoice `payment_failed`, emit `payment.failed`.
   - Amount mismatch → recorded and flagged; the invoice is not paid.
   - Success for an invoice that is already paid → that payment becomes `needs_refund`; the invoice is unchanged.
4. **Returning to the app proves nothing.** The screen shows "Checking your payment…" and polls `GET /invoices/{id}`. `POST /invoices/{id}/verify` asks the gateway for the payment's status and applies the same transition logic, for when a webhook is slow.
5. **Retry.** A failed bill can be paid again; each attempt is a new `payments` row.

**Other endpoints:** `GET /invoices` and `GET /invoices/{id}` (own only: items, breakdown, payment state, delivery state).

**Mock gateway (dev only):** a checkout page with buttons — succeed, fail, duplicate success, wrong amount — each sending a correctly signed webhook, so the real verification path is exercised.

## F9 · Notifications

In-app notifications, stored in `notifications`, created by event handlers. Each handler is idempotent per event and recipient.

| Type | Trigger | To | Text |
|---|---|---|---|
| `order_received` ＋ | `order.submitted` | Store owner | "A new community order has arrived from {community}." |
| `order_submitted` ＋ | `order.submitted` | Each contributing resident | "This month's order from your building has been sent to the store." |
| `order_rejected` ＋ | `order.rejected` | Contributing residents, admins | "The store could not take this month's order. You have not been charged." |
| `bill_ready` | `invoice.created` | That resident | "Your grocery order has been packed. Your final bill is ready. Please review your invoice and complete payment." |
| `payment_succeeded` | `payment.succeeded` | That resident | "Payment received. Thank you. Your order will be delivered by your building's coordinator." |
| `payment_failed` | `payment.failed` | That resident | "Your payment did not go through. You have not been charged. Please try again." |
| `payment_reminder` | Admin action | Unpaid resident(s) | "Your PACT grocery order is packed and ready. Please complete your pending payment so your order can be included in the delivery distribution." |
| `delivery_on_the_way` | Delivery → `out_for_delivery` | That resident | "Your PACT grocery order is ready for delivery. Our community delivery coordinator will bring it to you shortly." |
| `low_stock` ＋ | `inventory.low_stock` | Store owner | "{product} {variant} is running low: {n} left." |
| `product_request_resolved` ＋ | Request approved or rejected | Store owner | "Your request for {product} was approved / was not approved." |

**Endpoints:** `GET /notifications?unread=` · `POST /notifications/{id}/read` · `POST /notifications/read-all`. The web app shows a bell with an unread count and polls every 30 seconds.

## F10 · Retailer dashboard and collection

Every figure is an SQL aggregate over real rows. No stored counters, no sample numbers.

| Metric | Definition |
|---|---|
| Sales this month | Σ `total_paise` of this store's invoices with status `paid` and `paid_at` in the current IST month |
| Growth | `(this − last) / last × 100`, one decimal. `null` when last month is 0, shown as "—" |
| New customers | Residents whose first-ever order line with this store was submitted this month |
| Orders | `received` (all submitted this month) · `awaiting` (`submitted`) · `processing` (`accepted`, `packing`, `billed`) · `completed` · `rejected` |
| Low stock | Listings with `stock_qty − reserved_qty < min_stock_threshold`, not `inactive` |

**Collection for one order:** bill total · received (Σ paid invoices) · pending (Σ unpaid, non-void) · paid count · unpaid count · progress % · per-customer rows (name, flat, amount, status, transactions) · settlement line (`D8`).

**Endpoints:** `GET /retailer/dashboard` · `GET /retailer/orders/{id}/collections` · `GET /retailer/history?month=`.

## F11 · Admin dashboard and delivery

Everything is scoped to the admin's own community.

- **Overview:** residents in the order · number of bills · total bill value · received · pending · paid count · unpaid count · delivery counts (waiting, ready, on the way, delivered).
- **Paid section:** resident, flat, bill number, payment confirmation, delivery status, one next-step button, and the packed-item list for handover.
- **Unpaid section:** resident, flat, amount due, payment status, last reminder time, *Send reminder*, and *Remind all unpaid*.
- **Reminders:** one, several or all unpaid. At most one reminder per invoice per hour; the response reports `{sent, skipped_recent}`. Each records `sent_by`.
- **Delivery:** `paid → ready_for_distribution → out_for_delivery → delivered`, strictly one step at a time, each writing a `delivery_records` row with who and when. Moving to `out_for_delivery` sends the delivery notification.
- **Admins cannot change payment status.** There is no such endpoint.

**Endpoints:** `GET /admin/overview?cycle=YYYY-MM` · `GET /admin/invoices?section=paid|unpaid` · `GET /admin/invoices/{id}/handover` · `POST /admin/reminders {invoice_ids | all_unpaid}` · `POST /admin/deliveries/{invoice_id}/advance {to}` · `GET /admin/deliveries/{invoice_id}/history`.

## F12 · Events and Kafka

**Envelope**

```json
{ "id": "uuid", "type": "payment.succeeded", "occurred_at": "2026-11-27T09:15:00Z", "aggregate_id": "uuid", "payload": { } }
```

| Topic | Events | Key |
|---|---|---|
| `pact.orders` | `order.submitted` · `order.accepted` · `order.rejected` · `bill.finalised` · `invoice.created` · `delivery.status_changed` | order id |
| `pact.inventory` | `inventory.stock_changed` · `inventory.low_stock` | listing id |
| `pact.payments` | `payment.succeeded` · `payment.failed` | invoice id |
| `pact.catalogue` | `catalogue.product_changed` | product id |

- **Outbox:** `emit_event()` inserts into `outbox_events` in the caller's transaction. A rolled-back transaction emits nothing.
- **Inline transport (default):** a relay loop delivers unpublished events to in-process handlers, then marks them published.
- **Kafka transport (`P23`):** the relay publishes to the topic and marks published after broker acknowledgement; a consumer worker runs the same handlers, deduplicating on event id.
- **Kafka is never read for truth.** Stock, payment and order state always come from PostgreSQL.

## F13 · Search

- **Baseline:** PostgreSQL `pg_trgm` over product name, brand and aliases.
- **OpenSearch (`P24`):** index `pact-products`, one document per product: `id, name, brand, category_slug, aliases[], variant_labels[], is_active`. Multi-match over `name^3, aliases^2, brand` with fuzziness and edge n-grams for prefixes.
- **Projection only.** OpenSearch returns ranked product ids. Visibility, price and availability are then read from PostgreSQL exactly as in the baseline.
- **Kept fresh** by `catalogue.product_changed`, plus a full reindex command.
- **Unreachable?** Fall back to the baseline and log it.

## F14 · GSTIN

Checked once, at store registration. Never at sign-in.

- **Format:** 15 characters, `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`.
- **Checksum:** over the first 14 characters, using the alphabet `0-9A-Z` as values 0–35. Multiply values alternately by 1, 2, 1, 2 … starting with 1. For each product add `product // 36 + product % 36` to a sum. Check character = alphabet[`(36 − sum % 36) % 36`].
- **Outcome:** empty → `none`. Passes both → `format_valid`. Otherwise `422`.
- **Label, verbatim:** "Format checked · not government-verified". Never claim live verification.

| Input | Result |
|---|---|
| `27AAPFU0939F1ZV` | valid |
| `29ABCDE1234F1ZW` | valid |
| `22AAAAA0000A1Z5` | format passes, checksum fails (correct last character is `C`) |
| `27AAPFU0939F1Z` | too short |
| `27aapfu0939f1zv` | accept after upper-casing |

## U · Design system

The interface is part of the product, not decoration. Many residents will be first-time users of an app like this. If a screen needs explaining, the screen is wrong.

**Visual reference:** `design/ui-reference.html` shows the foundations and the key screens drawn with these tokens and the golden scenario's numbers. Open it in a browser, or take a screenshot of it, to see the intended look. Do not read its source to save tokens, and do not copy its markup: the tokens and specifications below are the source of truth, and they win if the two ever disagree.

### U1 · Brand

- **The mark** is a letter **P** assembled from three things: an apartment tower (the stem), a shop awning and counter (the bowl), and a home doorway (the foot). The building, the store and your front door, joined. The wordmark is lowercase **pact** in a soft, high-contrast serif.
- **Files** in `apps/web/public/brand/`: `pact-logo.png` (the original, 1024 px square, source of truth) · `pact-logo-lockup.png` (tight crop of mark + wordmark, for headers and sign-in) · `pact-mark.png` (the P alone on a square, for favicon and app icon).
- **Usage:** use the files as delivered. Never redraw, recolour, outline, stretch, rotate or add effects. Keep clear space of at least half the logo's height. Minimum width 96 px. The files have an `ice-200` background, so place them on `ice-200` surfaces, where they sit seamlessly.
- **Where it appears:** sign-in (large, centred) · top bar and sidebar (small) · bill and receipt header · favicon and app icon (`pact-mark.png`).
- **Personality:** a helpful neighbour, not a shopping mall. Calm, plain-spoken, trustworthy, a little warm. Nothing flashes or shouts. Urgency is reserved for a deadline or money.
- **Visual language, borrowed from the mark:** flat single-colour shapes in ink · rounded outer corners · thin horizontal stripes (the tower's floors, the awning) as the one decorative motif · generous pale space. No gradients, glass effects, heavy shadows, stock-photo banners or emoji used as icons.

### U2 · Colour

Two brand colours taken from the logo, **ink** and **ice**, one accent, three status colours. Every colour is a token. Components never contain raw hex values.

| Token | Hex | Use |
|---|---|---|
| `ink-900` | `#152A31` | Pressed state of the primary button |
| `ink-800` | `#203840` | **Brand ink (the logo colour)** · text · headings · primary buttons · icons |
| `ink-600` | `#415F69` | Secondary text, labels |
| `ink-500` | `#557079` | Helper text: the lightest colour allowed for words people must read |
| `ink-400` | `#6C8790` | Input borders, disabled text, decorative icons |
| `ice-50` | `#F3FAFB` | App background |
| `ice-100` | `#E6F4F5` | Hover, selected rows, quiet surfaces |
| `ice-200` | `#D3EBED` | **Brand surface (the logo background)** · sign-in screen · hero bands · top bar |
| `ice-300` | `#B8DADD` | Dividers, card borders, stripe motif |
| `white` | `#FFFFFF` | Cards, inputs, sheets |
| `teal-700` | `#17656F` | Links, focus ring, selected state, progress fill, current timeline step |
| `success-700` on `success-100` | `#1B6B45` on `#E3F4EA` | Paid, packed, delivered |
| `warning-700` on `warning-100` | `#7A4E00` on `#FFF1CF` | Closing soon, short-packed, waiting for payment |
| `danger-700` on `danger-100` | `#A3241C` on `#FCE8E6` | Failed, rejected, destructive actions |

`ink-800` and `ice-200` were sampled from the logo file itself; the other inks and ices are steps of the same hue. To change the palette, change it here only; everything else follows.

Measured contrast: `ink-800` on white 12.3:1, on `ice-200` 9.9:1 · `ink-600` on white 6.9:1 · `ink-500` on white 5.3:1 · `teal-700` on white 6.7:1, on `ice-200` 5.4:1 · each status text on its tint at least 5.7:1 · `ink-400` on white 3.8:1 (borders and large icons only).

- Light theme only in v1.
- The primary action is solid `ink-800` with white text. One per screen.
- Colour never carries meaning alone. Pair it with a word and an icon.
- Status colours are for status, never decoration.

### U3 · Type

| Role | Font | Use |
|---|---|---|
| Display | **DM Serif Display** | Screen titles, greeting, empty-state titles. The closest open match to the wordmark; if the logo's real typeface is known, change `--font-display` only. Never for body text, buttons, numbers or tables. |
| Interface | **DM Sans** 400 / 500 / 700 | Everything else |
| Hindi, Kannada | Noto Sans Devanagari, Noto Sans Kannada | Fallback stack for transcripts, aliases, future translations |
| Numbers | DM Sans with `tabular-nums` | Amounts line up in columns |

| Token | Customer app | Retailer / admin | Use |
|---|---|---|---|
| `display` | 30 / 36 serif | 28 / 34 serif | Screen title, greeting |
| `title` | 22 / 28 serif | 20 / 26 serif | Card and section titles |
| `body` | 18 / 28 | 16 / 24 | Default text |
| `label` | 16 / 22 · 500 | 14 / 20 · 500 | Buttons, field labels, pills |
| `small` | 14 / 20 | 13 / 18 | Helper text. Nothing readable is smaller. |
| `money-xl` | 40 / 44 · 700 | 32 / 36 · 700 | The amount to pay, headline figures |

Sentence case everywhere. No all-caps except the name PACT. No italics. Lines of at most 60 characters on customer screens. Fonts are loaded with `next/font`.

### U4 · Shape, space and layout

- **Spacing:** 4 px grid. Screen padding 16 px on mobile. 24 px between sections. Cards padded 16 px (mobile) or 24 px (desktop).
- **Corners:** cards and sheets 16 · buttons and inputs 12 · pills and chips fully round. This echoes the rounded foot of the mark.
- **Lines and depth:** 1 px `ice-300` borders. No shadows on cards. One soft shadow, `0 8px 24px rgb(32 56 64 / 0.12)`, for things that float: sheet, dialog, toast, sticky bar.
- **Stripe motif:** 2 px `ice-300` lines every 6 px, as a quiet band behind sign-in and empty-state art only.
- **Touch:** targets at least 48 × 48 px, at least 8 px apart. Primary button 52 px tall, full width on mobile, pinned to the bottom on screens with one main action.
- **Customer app:** one column, 480 px maximum, centred on larger screens. Bottom navigation with four items.
- **Retailer and admin:** 240 px sidebar, content up to 1200 px. Below 768 px tables become stacked cards and the sidebar becomes tabs. Packing and delivery must work on a phone.
- **Motion:** 150–200 ms ease-out for press, sheet and toast. Nothing loops. Honour `prefers-reduced-motion`.
- **Icons:** lucide-react, 24 px, 1.75 stroke, `ink-800`, always beside a text label. Icon-only is allowed for back, close, search, bell and mic, each with an `aria-label`.
- **Product images:** square, on white, corners 12, `object-contain`. A category glyph when missing.

### U5 · UI kit

Built once in `P04` from shadcn/ui (Radix primitives) and Tailwind, restyled to these tokens, living in `components/ui`. Screens compose the kit. They do not invent new visual patterns. If a screen truly needs a new component, add it to the kit and to `/styleguide`.

| Component | Specification |
|---|---|
| `Button` | Variants: primary (`ink-800`, white text) · secondary (white, 1 px `ink-800` border) · quiet (`teal-700` text) · danger (`danger-700`, white text). Sizes: 52 px and 44 px. States: hover, pressed, focus ring (2 px `teal-700`, 2 px offset), disabled, loading (spinner, label stays). |
| `TextField` `PhoneField` `OtpInput` | Label always visible above the field. 52 px tall. Helper or error text below. `PhoneField` has a fixed `+91` and opens the number keypad. `OtpInput` has six boxes, auto-advance, paste, and `autocomplete="one-time-code"`. |
| `Stepper` | `−  2  +` with 48 px buttons. At 1, the minus becomes a remove icon. |
| `Card` | White, corners 16, 1 px `ice-300`. |
| `StatusPill` | Icon + word on a tint. Kinds: neutral, info, success, warning, danger. |
| `MoneyText` | Takes paise. Indian grouping. An `approx` option prefixes "About". |
| `ProgressBar` | 12 px tall, `ice-100` track, `teal-700` fill, with a written label: "₹1,890 of ₹2,250 received · 84%". |
| `MonthTimeline` | Five steps: Add items → Sent to store → Packed → Pay → Delivered. Done = success check. Current = `teal-700`, bold label. Future = `ice-300`. One sentence beneath says what is happening and what comes next. |
| `Tabs` `Chip` | Chips for categories and variants. Selected = `ink-800` fill, white text. |
| `DataTable` | Sticky header, 56 px rows, `ice-100` hover, numbers right-aligned. Stacked cards below 768 px. |
| `Dialog` `Sheet` | Dialog on desktop, bottom sheet on mobile. The title is the question, the body is the consequence, the buttons are verbs ("Finalise bill", "Go back"). Never "OK / Cancel". |
| `Toast` | Bottom of screen, 5 seconds, optional Undo, one at a time. |
| `Banner` | Inline message: info, warning or danger. Icon, one sentence, optional action. |
| `EmptyState` | Stripe band with an ink glyph, serif title, one sentence, one button. |
| `Skeleton` | `ice-100` blocks in the shape of the content to come. |
| `TopBar` `BottomNav` `Sidebar` | Bottom navigation: four items, icon and label; the current one sits on an `ice-200` pill. |
| `MicButton` | 88 px circle. Idle: `ink-800` with a mic. Listening: `teal-700` with a soft ring and the words "Listening… tap to stop". Error: danger outline with a label. |

### U6 · Layman-first rules

The typical resident is a neighbour, not "a user": possibly older, possibly paying in an app for the first time, possibly more comfortable in Hindi. Every screen must pass all of these.

1. **One main thing per screen.** One primary button. Everything else is quieter.
2. **Always answer three questions:** where am I, what is happening with my order, what do I do next.
3. **Words first.** Every icon has a label. Every status is a word.
4. **No jargon, codes or internal names.** Use `U7`.
5. **Tap, don't type.** Steppers, chips and big option buttons. The keyboard appears only for search, phone number and code.
6. **Nothing is lost.** Lists save as you go. Removing offers Undo. A reload returns to the same place.
7. **No surprises with money.** Estimates say "About". The final amount is large, with a plain breakdown, before any Pay button.
8. **Confirm what cannot be undone,** in plain words that say what will happen.
9. **Errors say what happened and what to do next,** in one or two sentences, with a button.
10. **Waiting is honest.** "Checking your payment…", never a blank screen. Use a skeleton for anything slower than 300 ms.
11. **Voice is optional and editable.** Typing is always one tap away.
12. **Same thing, same place, same word,** everywhere.
13. **No dead ends.** Every empty or finished screen offers a next step.
14. **Works on a small, slow phone:** 360 px wide, one hand, patchy network.

### U7 · Words

Short, warm, direct. Speak to "you". Buttons are verbs with their object: "Pay ₹720", "Add to my list". Dates read "24 Nov"; times "11:59 pm"; money "₹720", keeping paise only when present ("₹716.67").

| Internal term | On screen |
|---|---|
| community | "your building", or its name |
| customer cart contribution | **My list** |
| community cart | **Our building's order** |
| cutoff, lock | "Ordering closes on 24 Nov, midnight" |
| order submitted | "Sent to the store" |
| accepted, packing | "The store is packing your order" |
| short-packed | "The store had less: packed 1 of 2" |
| unavailable | "Not available this month" |
| invoice | **My bill** |
| estimated price | "About ₹300" |
| overall discount share | "Community discount" |
| delivery share | "Delivery" |
| `bill_generated`, `payment_failed` | "To pay" |
| `payment_pending` | "Checking your payment…" |
| `paid` | "Paid" |
| `ready_for_distribution` | "Ready to deliver" |
| `out_for_delivery` | "On the way" |
| `delivered` | "Delivered" |
| retailer | "the store" (never its name, for customers) |
| OTP | "6-digit code" |

| Situation | Say | Not |
|---|---|---|
| Cart locked | "Ordering for this month has closed. You can add items again from 1 Dec." | "Error 409: CART_LOCKED" |
| Payment failed | "Your payment did not go through. You have not been charged. Try again." | "Transaction declined" |
| Network down | "No internet right now. Your list is saved. We'll keep trying." | "Request failed" |
| Voice not understood | "I didn't catch that. Tap the mic and try again, or type it." | "Speech recognition error" |
| Nothing packed | "The store couldn't pack any of your items this month. There is nothing to pay." | "Invoice void" |

### U8 · Screen blueprints

**Customer** · mobile-first · bottom navigation: **Home · Shop · My list · Bills**

| Screen | Blueprint |
|---|---|
| Sign-in | Logo on `ice-200` with the stripe band. "Welcome to PACT." `Type | Speak` toggle. Phone field, then "Send code". Code step: six boxes, "Didn't get it? Send again in 0:30". |
| Join | "Which building do you live in?" Building code, your name, flat number. One button: "Join my building". |
| Choose how to order | Two large cards: **Type & tap** and **Speak**. Beneath: "You can switch any time." |
| Home | Greeting in serif. `MonthTimeline`. One main card that changes with the month: *Add this month's groceries · closes in 6 days* → *Sent to the store* → *The store is packing your order* → *Your bill is ready · ₹720 · Pay now* → *Paid · delivery coming* → *On the way* → *Delivered on 28 Nov*. Below: "Our building this month: 4 neighbours, 12 items." |
| Shop | Search with a mic shortcut. Twelve category chips. Two-column product grid: image, name, variant chips, "About ₹300", **Add** that turns into a `Stepper`. Sticky bar: "My list · 4 items · about ₹800 → View". |
| My list | Own lines with `Stepper`; remove shows a `Toast` with Undo. Estimated total with the note "The store confirms the final price when it packs." Collapsible "Our building's order" (anonymous totals). Closing-date `Banner`. After closing: read-only, with a plain explanation. |
| Speak | Language switch (English, हिंदी). `MicButton`. Live transcript in an editable box. "This is what I understood": each line with quantity, pack, edit and remove. One clarifying question at a time, as a card with big option buttons. Then "Add to my list". |
| My bill | Amount in `money-xl`, `StatusPill`. Items showing "Asked 2 · Packed 1" where they differ. Breakdown: Your items · Community discount · Delivery · **You pay**. Expandable "How is this calculated?" in two plain sentences. Sticky "Pay ₹720". |
| Payment result | "Checking your payment…" → **Paid** with a receipt, or **Didn't go through** with "Try again". |
| Notifications | List, newest first, unread dot, tap to open the related screen. |

**Retailer** · desktop-first · sidebar: **Dashboard · Orders · Inventory · Payments**

| Screen | Blueprint |
|---|---|
| Store registration | Store name, address, optional GSTIN with live check and the `F14` label. Then "Waiting for approval". |
| Dashboard | Four stat cards: sales this month with growth · new customers · orders by state · low stock. Then incoming orders, the low-stock list, and sales history. |
| Inventory | Twelve category tabs. Search. Filters: availability, low stock. Table with inline edit for price, stock and threshold; `+ / −` stock dialog with a reason; low-stock badge; movement history in a sheet. "Add product" wizard. "Request a new product". |
| Orders | List with community name, month, `StatusPill`, totals. |
| Order detail | Four-step header: Review → Accept → Pack → Bill. Review has "By product" and "By customer" tabs. Accept, or Reject with a reason dialog. |
| Packing | "By product" and "By customer" views. Each line: asked quantity and a packed `Stepper`, pre-filled. Quick actions "All packed" and "None available". Short lines carry a warning pill with words. Saves as you go. Usable one-handed on a phone. |
| Bill | Table of products with editable final price and discount. Overall discount. Delivery charge. Live total. Side panel: the split per customer. "Finalise bill" opens a confirmation that states the total, the discount, the number of bills, and that it cannot be changed afterwards. |
| Payments | `ProgressBar` with the written label. Paid and unpaid counts. Per-customer table with status and transactions. Settlement line. |

**Admin** · works equally on desktop and phone · **Overview · Paid · Unpaid**

| Screen | Blueprint |
|---|---|
| Overview | Stat cards: residents in the order · total bill · received · pending · paid and unpaid counts · delivery counts. |
| Paid | Rows: resident, flat, amount, delivery `StatusPill`, and one next-step button: "Mark ready" → "Out for delivery" → "Delivered". Tap a row for the packed-item list. |
| Unpaid | Rows: resident, flat, amount due, last reminded, "Send reminder". Above the list: "Remind all unpaid (1)" with a confirmation. |

**Platform** · bare and functional: pending stores · communities and their assigned store · product requests.

### U9 · UI quality bar

Every UI prompt is done only when all of these hold for its screens.

- [ ] Built from kit components and tokens only. No raw hex values, no one-off styles.
- [ ] Every string comes from `lib/copy/en.ts` and follows `U7`.
- [ ] Loading (skeleton), empty (`EmptyState`), error (`Banner` with an action) and success states all exist.
- [ ] Works at 360 px wide with no horizontal scroll, and at 200 % text zoom.
- [ ] Every control is reachable by keyboard with a visible focus ring, and has an accessible name.
- [ ] Text contrast at least 4.5:1; controls and their borders at least 3:1.
- [ ] Touch targets at least 48 px.
- [ ] Status is never shown by colour alone.
- [ ] Amounts use `MoneyText`; dates and times are formatted in `Asia/Kolkata`.
- [ ] An automated axe check on the route reports no violations.
- [ ] The screen passes `U6` rules 1, 2 and 13: one main action, clear status, a next step.

## X · Out of scope

Do not build these. If a task seems to need one, stop and ask.

- **Cross-retailer shortage handling,** removed from the product: broadcasting a shortage to nearby stores · first-store-to-accept fulfilment · splitting one customer's order across stores · transferring stock or fulfilment between stores · redistributing customers across stores.
- **PACT NOW** urgent individual orders (`D2`).
- **Multiple stores per community order** (`D3`).
- **Substitutions**, counter-proposals and customer approval of packing changes (`D5`, `D6`).
- **Refund and cancellation flows**, partial payments, credit notes (`D17`).
- **Real settlement to stores**, vendor onboarding and KYC (`D8`).
- **Live government GSTIN verification** (`D11`).
- **Editing another resident's items**, by anyone.
- **Manual "mark as paid"**, by anyone (`R10`).
- Dark mode, native mobile apps, and languages beyond English and Hindi.

## G · Golden scenario

One story, used by the seed, the tests and the demo. Every number below must come out exactly.

**People and places** (seed phone numbers are placeholders used only with the dev code; never send real messages to them)

| Who | Role | Where | Phone |
|---|---|---|---|
| Asha | customer | Green Meadows Apartments, A-101 | +91 99999 00001 |
| Bharat | customer | Green Meadows Apartments, B-204 | +91 99999 00002 |
| Chitra | customer | Green Meadows Apartments, C-305 | +91 99999 00003 |
| Dev | customer | Green Meadows Apartments, D-402 | +91 99999 00004 |
| Esha | customer | Lakeview Residency, L-11 | +91 99999 00005 |
| Meera | community admin | Green Meadows Apartments | +91 99999 00011 |
| Nikhil | community admin | Lakeview Residency | +91 99999 00012 |
| Ravi | retailer | Sri Lakshmi Stores → serves Green Meadows | +91 99999 00021 |
| Farah | retailer | Daily Needs Mart → serves Lakeview | +91 99999 00022 |
| Priya | platform admin | — | +91 99999 00099 |

Building codes: Green Meadows `GREEN1`, Lakeview `LAKE01`.

**Catalogue facts**

| Product (central) | Variants | Sri Lakshmi Stores | Daily Needs Mart |
|---|---|---|---|
| Sona Masoori Rice | 1 kg · 5 kg | 5 kg: MRP ₹340, sells ₹300 | 5 kg: MRP ₹340, sells ₹320 |
| Basmati Rice | 1 kg · 5 kg | not listed | listed |
| Sugar | 1 kg · 5 kg | 1 kg: MRP ₹80, sells ₹75 | listed |
| Sunflower Oil | 1 L · 5 L | 1 L: MRP ₹270, sells ₹250 | listed |
| Toor Dal | 500 g · 1 kg | 500 g: MRP ₹110, sells ₹100 | listed |

Both rice products carry the generic aliases "rice", "chawal" and "चावल". Sri Lakshmi Stores lists only one of them, so "rice" is unambiguous at Green Meadows and ambiguous at Lakeview. Use generic or invented brand names in the seed, not real trademarks.

**1 · Ordering.** Asha says: *"I need 5 kg rice, 2 kg sugar, one litre sunflower oil and 500 grams of toor dal."*

| Resident | Lines | Estimated total |
|---|---|---|
| Asha | Rice 5 kg × 1 · Sugar 1 kg × 2 · Sunflower Oil 1 L × 1 · Toor Dal 500 g × 1 | ₹800 |
| Bharat | Rice 5 kg × 2 | ₹600 |
| Chitra | Rice 5 kg × 1 · Toor Dal 500 g × 1 | ₹400 |
| Dev | Rice 5 kg × 2 · Toor Dal 500 g × 1 | ₹700 |

**2 · Cutoff.** One bulk order, 9 customer lines: Rice 5 kg × 6 (30 kg) · Sugar 1 kg × 2 · Sunflower Oil 1 L × 1 · Toor Dal 500 g × 3. Gross ₹2,500.

**3 · Billing.** Ravi accepts, packs everything, and gives an overall discount of ₹250.

| Resident | Subtotal | Community discount | Pays |
|---|---|---|---|
| Asha | ₹800 | ₹80 | **₹720** |
| Bharat | ₹600 | ₹60 | **₹540** |
| Chitra | ₹400 | ₹40 | **₹360** |
| Dev | ₹700 | ₹70 | **₹630** |
| Bill | ₹2,500 | ₹250 | **₹2,250** |

Variant for short-pack tests: Dev's Toor Dal is packed 0 → invoices ₹716.67 · ₹537.50 · ₹358.33 · ₹537.50, bill ₹2,150.

**4 · Payment.** Asha, Bharat and Dev pay. Ravi's collection view reads **₹1,890 of ₹2,250 received · 84%**, 3 paid, 1 unpaid, ₹360 pending.

**5 · Delivery.** Meera sees three residents under Paid and Chitra under Unpaid. She reminds Chitra, then takes the three paid orders through Ready → On the way → Delivered.

**Isolation checks along the way:** Esha sees the rice pack at ₹320 and never sees Green Meadows · Farah never sees Ravi's order · Nikhil never sees Meera's residents · nobody at Green Meadows sees the words "Sri Lakshmi Stores" in the customer app.

---

# Part 3 · Build prompts

Each block is one agent session. Copy the whole block. Do them in order.

| Stage | Prompts | You end up with |
|---|---|---|
| 0 · Foundation | `P00 – P03` | Running skeleton, full schema, seed data, sign-in |
| 1 · Look and entry | `P04 – P05` | Design system, sign-in screens, the four app shells |
| 2 · Catalogue and inventory | `P06 – P08` | Stores manage stock; residents have a catalogue |
| 3 · Shared cart and cycle | `P09 – P11` | Residents order together; the bulk order is submitted |
| 4 · Fulfilment and billing | `P12 – P14` | Store packs, bills; the bill is split |
| 5 · Payments | `P15 – P17` | Residents are notified and pay |
| 6 · Dashboards and delivery | `P18 – P19` | Collection tracking, reminders, delivery. **Full loop works.** |
| 7 · Voice | `P20 – P22` | Voice ordering and voice sign-in |
| 8 · Scale-out | `P23 – P24` | Kafka and OpenSearch on Aiven |
| 9 · Harden and ship | `P25 – P26` | Security pass, end-to-end demo, deployment |

## Stage 0 · Foundation

### P00 · Scaffold and tooling

`Needs:` nothing

```text
PACT · P00 — Scaffold and tooling
Open README.md. Read Part 1 (Core) in full and follow its Agent protocol (C7). Read no other section.

Build
1. The monorepo exactly as laid out in C5: apps/api (FastAPI, SQLAlchemy 2 sync with psycopg 3, Alembic,
   pydantic-settings, pytest, hypothesis, ruff) and apps/web (Next.js App Router, strict TypeScript,
   Tailwind, ESLint, Playwright).
2. docker-compose.yml with PostgreSQL 16 only: one dev database, one test database.
3. Makefile targets: dev, api, web, migrate, seed (stub for now), test, lint.
4. API: GET /api/v1/health that pings the database; settings from environment; .env.example; the C6 error
   envelope with global exception handlers; core/clock.py (UTC now and business-timezone now, both
   overridable in tests); a request-scoped session with one transaction per request.
5. Web: a rewrite of /api/:path* to API_URL; lib/api.ts, a typed fetch wrapper that throws on the error
   envelope; an unstyled landing page showing live API health. Visual design comes in P04; add none now.
6. pytest runs against the real test database with per-test rollback.
7. Fill in "Run it" in Part 4 of README.md with the exact commands.

Done when
- make dev starts database, API and web; the landing page shows the API as healthy.
- make test and make lint pass from a clean clone using only the "Run it" instructions.
```

### P01 · Database schema

`Needs:` P00

```text
PACT · P01 — Database schema and migrations
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D7, M (all blocks), S.

Build
1. SQLAlchemy models for every table in M1–M7 except processed_events and push_subscriptions, one module
   per block, with PostgreSQL enums for every state in S.
2. One Alembic migration that creates them, including: every UNIQUE and CHECK written in M; BIGINT paise
   columns with CHECK >= 0; foreign keys ON DELETE RESTRICT; indexes on every foreign key and status
   column; the pg_trgm extension with trigram indexes on products.name and product_aliases.alias;
   created_at and updated_at everywhere.
3. The partial unique index allowing only one succeeded payment per invoice.
4. A database trigger or constraint making customer_order_items.requested_qty immutable after insert.

Tests (each must be rejected by the database itself, not by Python)
- duplicate listing for one store and variant · selling price above MRP · negative stock · reserved above
  stock · packed above requested · second cart for one community and month · second order for one cart ·
  duplicate gateway_event_id · second succeeded payment for one invoice · update of requested_qty.
- upgrade → downgrade → upgrade runs clean.

Done when: make migrate builds the schema from an empty database and all tests pass.
```

### P02 · Seed data and golden fixture

`Needs:` P01

```text
PACT · P02 — Seed data and golden fixture
Open README.md. Read Part 1 (Core) and follow C7. Then read only: M1–M4, F2, G.

Build
1. make seed, idempotent:
   - the 12 categories in the F2 order;
   - at least 60 products (5 or more per category, everyday Indian groceries, generic or invented brand
     names) with at least 100 variants;
   - for every product, aliases in English, Hindi in Latin letters, and Hindi in Devanagari;
   - a placeholder image per product at apps/web/public/products/<slug>.svg;
   - every person, building, store, listing and price in G, exactly as written there. Sri Lakshmi Stores
     lists most of the catalogue but not Basmati Rice; Daily Needs Mart lists an overlapping subset at
     different prices;
   - an open cart for the current month for both buildings.
2. tests/factories.py with a builder for every model, and a `golden` pytest fixture that creates G inside
   the test transaction, including the four residents' cart lines.

Done when
- Running make seed twice changes nothing the second time.
- A test asserts: 12 categories in order; the G prices; the 5 kg rice pack listed by both stores at
  ₹300 and ₹320; Asha's four cart lines; "rice" aliases on both rice products.
```

### P03 · Sign-in, access guards and plumbing

`Needs:` P02

```text
PACT · P03 — Sign-in, access guards and core plumbing
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D10, D12, M1, M7, F1, F12.

Build (apps/api)
1. The F1 endpoints: request code, verify code, me, logout, and the two onboarding endpoints (resident
   joins a building; retailer registers a store, left pending — GSTIN checking arrives in P06).
2. The F1 code rules and session cookie exactly as written, including OTP_MODE=dev.
3. The dependencies every later module must use: current_user · require_role(...) · current_retailer
   (the active store owned by the session user) · current_membership (the user's building). No other
   code may take a tenant id from the request.
4. core/events.py: emit_event(db, type, aggregate_id, payload) writing outbox_events in the caller's
   transaction; a handler registry; an inline relay loop (EVENT_TRANSPORT=inline) that delivers each
   event to its handlers exactly once and then marks it published.
5. core/audit.py: audit(db, actor, action, entity, entity_id, before, after).

Tests
- Code: success, wrong code, expired, attempt limit, request rate limit, identical answer for an unknown
  phone.
- Role matrix: every role against one protected route per workspace, expecting the C6 status codes.
- Tenant guards: a retailer or admin can never resolve another tenant, whatever ids are sent.
- Relay: an emitted event reaches its handler once, even if the relay restarts mid-batch; a rolled-back
  transaction emits nothing.

Done when: tests pass and every G person can sign in through the API in dev mode.
```

## Stage 1 · Look and entry

### P04 · Design system and UI kit

`Needs:` P00 · the logo files in `apps/web/public/brand/`

```text
PACT · P04 — Design system and UI kit
Open README.md. Read Part 1 (Core) and follow C7. Then read only: U1, U2, U3, U4, U5, U9.
If you can render pages, look at design/ui-reference.html in a browser for the intended look. Take
values from U, not from that file's source.

Build (apps/web)
1. Tokens: every colour, radius, shadow, spacing rule and font in U2–U4 as CSS variables in globals.css,
   mapped into the Tailwind theme. Add a lint or grep check that fails if a raw hex colour appears
   anywhere outside the token file.
2. Fonts through next/font: DM Serif Display (display), DM Sans (interface), Noto Sans Devanagari
   (fallback). Tabular numerals on amounts.
3. Brand: use the files in public/brand/ exactly as delivered. Build <Logo> from pact-logo-lockup.png
   and the favicon and app icon from pact-mark.png. If the files are missing, stop and ask.
4. The kit in components/ui, each component to its U5 specification: Button, TextField, PhoneField,
   OtpInput, Stepper, Card, StatusPill, MoneyText, ProgressBar, MonthTimeline, Tabs, Chip, DataTable,
   Dialog, Sheet, Toast, Banner, EmptyState, Skeleton, TopBar, BottomNav, Sidebar, MicButton. Start from
   shadcn/ui (Radix) and restyle to the tokens. Icons from lucide-react.
5. lib/format.ts: money from paise ("₹1,23,456.50", dropping ".00"), dates and times in Asia/Kolkata
   ("24 Nov", "11:59 pm"), relative days ("closes in 6 days"). lib/copy/en.ts as the single home for
   interface strings.
6. A /styleguide route (dev only) showing every component in every state, on ice-50 and on white.

Done when
- /styleguide renders the whole kit; everything is reachable by keyboard with a visible focus ring; an
  automated axe check on /styleguide reports no violations.
- Unit tests for format.ts: Indian grouping, paise, zero, large values.
- The raw-hex check, lint and typecheck pass.
```

### P05 · App shells and sign-in screens

`Needs:` P03, P04

```text
PACT · P05 — App shells and sign-in (typing)
Open README.md. Read Part 1 (Core) and follow C7. Then read only: F1, U6, U7, U9, and in U8 the rows
Sign-in, Join, Choose how to order, plus the navigation line of each workspace.

Build (apps/web) — kit components only
1. /login: logo, the Type | Speak toggle, phone step, then the 6-digit code step with a resend timer.
   "Speak" uses a useSpeech() stub for now and shows the same form; P21 and P22 make it real.
2. First sign-in: "I live here" (building code, name, flat) or "I run a store" (a placeholder until P07).
3. Route protection from GET /auth/me: signed out → /login; wrong workspace → own home.
4. Four shells with the U8 navigation: customer (TopBar + BottomNav), retailer (Sidebar), admin (Sidebar
   that becomes tabs on mobile), platform (bare).
5. /customer/start: "How would you like to order?" with Type & tap and Speak. The choice lasts the
   session, can be switched from the TopBar at any time, and is independent of how the person signed in.
6. A placeholder page with a proper EmptyState for every navigation item.

Done when
- Playwright: Asha, Ravi and Meera each sign in with the dev code and land in the right shell; Asha is
  turned away from /retailer.
- Sign-in is comfortable one-handed at 360 px; every U9 item holds for these screens.
```

## Stage 2 · Catalogue and inventory

### P06 · Store onboarding and inventory API

`Needs:` P03

```text
PACT · P06 — Store onboarding, GSTIN and inventory API
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D11, D18, M2, M3, F5, F14.

Build (apps/api)
1. Store registration with GSTIN handled exactly as F14.
2. The F5 platform endpoints, for platform_admin only. Approving a product request creates the product
   or variant, or maps the request to an existing one.
3. The F5 retailer endpoints: list with filters, search the central catalogue, create listing, edit
   listing, adjust stock (delta + reason), set availability, movement history, product requests.
4. Every stock change writes stock_movements, and every stock or price change writes audit_log, in the
   same transaction. Emit inventory.stock_changed, and inventory.low_stock once per downward crossing.

Tests
- GSTIN: every row of the F14 table.
- Isolation: Ravi cannot read, edit or adjust Farah's listings (404), and the reverse.
- Duplicate listing → 409. Selling price above MRP → 422. Stock never below 0 or below reserved.
- Exactly one movement row per stock change. The low-stock event fires once per crossing.
- A retailer has no way to create a central product directly.

Done when: tests pass.
```

### P07 · Retailer inventory screens

`Needs:` P05, P06

```text
PACT · P07 — Retailer inventory screens
Open README.md. Read Part 1 (Core) and follow C7. Then read only: F5, F14, U6, U7, U9, and in U8 the
rows Store registration, Inventory, and the Platform line.

Build (apps/web) — kit components only
1. /retailer/register: the store form with a live GSTIN check and the exact F14 label, then a
   "Waiting for approval" screen.
2. /retailer/inventory to the U8 blueprint: category tabs, search, filters, inline editing of price,
   stock threshold and availability, the stock + / − dialog with a reason, low-stock badges, movement
   history in a Sheet.
3. "Add product": category → search the central catalogue → variant → store details. When nothing
   matches: "Request a new product", and a "My requests" list.
4. /platform, bare but working: pending stores (activate), buildings (assign a store), product requests
   (approve or reject).

Done when
- Playwright: Ravi adds a listing, edits its price inline, records a replenishment, and watches it leave
  the low-stock list.
- Nothing belonging to another store is ever rendered. U9 holds.
```

### P08 · Customer catalogue API

`Needs:` P06

```text
PACT · P08 — Customer catalogue API
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D1, D13, M2, M3, F2, F13 (baseline).

Build (apps/api)
1. GET /catalogue/categories, GET /catalogue/products (category, q, cursor) and
   GET /catalogue/products/{id}, scoped to the signed-in customer's building as F2 defines.
2. Search across name, brand and aliases with PostgreSQL trigram, behind a SearchBackend interface so
   P24 can add OpenSearch without touching callers.
3. Response objects built from an explicit allow-list of fields.

Tests
- A product listed by both G stores appears once. Asha sees the 5 kg rice at ₹300; Esha sees ₹320.
- No response contains anything identifying a store: a recursive check for retailer, store and sku
  keys, and for both store names as values.
- Variants are separate options on one product. Inactive listings disappear. Zero stock does not hide
  a product.
- Searching "chawal" and "चावल" finds rice; "atta" finds flour.

Done when: tests pass.
```

## Stage 3 · Shared cart and cycle

### P09 · Shared cart and monthly cycle API

`Needs:` P08

```text
PACT · P09 — Shared cart and monthly cycle API
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D4, M4, S, F4, G.

Build (apps/api)
1. A cycle service that computes opens_at and locks_at for any month from D4, and
   ensure_open_cart(community), which creates the month's cart and snapshots the assigned store.
2. The cycle tick as a command (python -m app.workers.cycle_tick) that can also run as an inline loop in
   dev. In this prompt it only opens carts; locking comes in P11.
3. The F4 cart endpoints and the exact GET /cart shape, including the anonymous community block with
   totals per variant and per product in base units.
4. Write rules exactly as F4: own lines only, visible variants only, open cart only, before locks_at.

Tests
- G: with the four residents' lines in place, the building's rice total is 6 packs / 30 kg, and each
  resident receives only their own lines.
- A resident cannot touch another resident's line or another building's cart, whatever ids are sent.
- A write at 24th 23:59:59 IST succeeds; at 25th 00:00:00 IST it answers 409 CART_LOCKED (move the clock).
- Upsert behaviour; quantity 0 removes; the batch endpoint is all or nothing.

Done when: tests pass.
```

### P10 · Customer shop and "My list" screens

`Needs:` P05, P09

```text
PACT · P10 — Customer shop and "My list" screens
Open README.md. Read Part 1 (Core) and follow C7. Then read only: F2, F4, U6, U7, U9, and in U8 the
rows Home, Shop, My list.

Build (apps/web) — kit components only
1. /customer (Home): greeting, MonthTimeline, the main card (only its "ordering open" and "ordering
   closed" states exist yet), and the "Our building this month" summary.
2. /customer/shop: search, the twelve category chips, the product grid. Each card: image, name, variant
   chips, the "About ₹…" price, and Add that turns into a Stepper. The sticky "My list" bar.
3. /customer/list: own lines with Stepper and remove (Toast with Undo), the estimated total with its
   note, the collapsible anonymous building totals, the closing-date Banner. After closing: read-only
   with the U7 explanation.
4. Optimistic updates that roll back on error. Skeletons while loading. EmptyStates.

Done when
- Playwright: Asha searches "rice", adds the 5 kg pack, raises it to 2, removes it, taps Undo; the list
  survives a reload.
- With the clock past cutoff, every add and edit control is disabled and the closed message shows.
- No store name appears anywhere. U9 holds at 360 px.
```

### P11 · Cutoff and bulk order

`Needs:` P09

```text
PACT · P11 — Cutoff: lock the cart, submit the bulk order
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D4, D14, M4, S, F4, F12.

Build (apps/api)
1. Extend the cycle tick with the five cutoff steps in F4, in one transaction per cart.
2. Safe to repeat and safe under concurrency: two ticks at once produce exactly one order.
3. A dev-only endpoint (refused unless APP_ENV=dev): POST /dev/cycle/lock-now {community_id}.
4. GET /orders/current for a customer: this month's order status and their own lines.

Tests
- The G cart becomes one order with 9 customer lines; totals per variant are 6, 2, 1 and 3 packs; prices
  are snapshotted, so a later listing price change does not alter the order.
- Running the tick twice, or two ticks concurrently, yields one order.
- An empty cart becomes closed_empty with no order. Other buildings' carts are untouched.
- requested_qty cannot be changed afterwards.

Done when: tests pass and lock-now works in dev.
```

## Stage 4 · Fulfilment and billing

### P12 · Bill-splitting engine

`Needs:` P00

```text
PACT · P12 — Bill-splitting engine (pure code, no database)
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D7, F7.

Build (apps/api/app/modules/billing/split.py)
1. allocate(total, weights, keys): largest remainder in integer paise with the F7 tie-break.
2. split_bill(...): F7 steps 1–7 and its validations, returning bill totals, bill lines, and one invoice
   with items per customer. Plain dataclasses in and out. No I/O. No floats.

Tests
- Every row of the F7 worked-examples table, to the paisa.
- Property tests with hypothesis: invoices always sum to the bill total; nothing is negative; the result
  does not depend on input order; allocate() always sums to its total.
- Validation: a discount larger than its base, a price above MRP, negative inputs.

Done when: tests pass and the module imports nothing from FastAPI or SQLAlchemy.
```

### P13 · Retailer order processing API

`Needs:` P11, P12

```text
PACT · P13 — Retailer order processing API
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D5, D6, D14, D18, M3, M4, M5, S, F6, F12.

Build (apps/api)
1. The F6 endpoints: list, detail (totals per variant, and a per-customer breakdown with name and flat
   only), accept, reject, save packing, save draft bill, preview, finalise.
2. Accept reserves stock as F6 step 2. Accept and reject are single transactions with row locks.
3. Preview runs split_bill and saves nothing.
4. Finalise performs F6 step 6 in one transaction.
5. After finalise, everything about the bill is read-only.

Tests
- G end to end: accept → pack everything → ₹250 overall discount → invoices 720, 540, 360, 630 and a
  bill of 2,250; stock falls by 6, 2, 1 and 3.
- The G short-pack variant, to the paisa.
- State guards: packing before accept, finalising twice, editing after billed → 409.
- Farah cannot see or act on Ravi's order (404). No retailer response contains a phone number.
- Packed above requested → 422. Packed above stock at finalise → 409 naming the variants.
- A failure inside finalise leaves no bill, no invoices and no stock change.

Done when: tests pass.
```

### P14 · Retailer order, packing and billing screens

`Needs:` P07, P13

```text
PACT · P14 — Retailer order, packing and billing screens
Open README.md. Read Part 1 (Core) and follow C7. Then read only: F6, U6, U7, U9, and in U8 the rows
Orders, Order detail, Packing, Bill.

Build (apps/web) — kit components only
1. /retailer/orders: the list.
2. Order detail with the four-step header. Review with "By product" and "By customer" tabs. Accept, or
   Reject with a reason Dialog.
3. Packing to the U8 blueprint: both views, pre-filled Steppers, "All packed" and "None available",
   short lines flagged in words, saving as you go, comfortable on a phone.
4. Bill: editable final price and discount per product, overall discount, delivery charge, live totals,
   and a side panel showing the per-customer split from the preview endpoint.
5. Finalise: the confirmation Dialog described in U8.

Done when
- Playwright: Ravi takes the G order from Review to a finalised ₹2,250 bill and sees four customer
  amounts: 720, 540, 360, 630.
- Reloading in the middle of packing loses nothing. U9 holds.
```

## Stage 5 · Payments

### P15 · Notifications

`Needs:` P13

```text
PACT · P15 — Notifications
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D16, M7, F9, U6, U7, U9, and in U8
the row Notifications.

Build
1. API: a notification service and event handlers for every F9 row whose trigger already exists
   (order.submitted, order.rejected, invoice.created, inventory.low_stock, product request resolved).
   Texts exactly as F9. Handlers idempotent per event and recipient.
2. API: the three F9 endpoints, for the caller's own notifications only.
3. Web: a bell with an unread count in every shell, the notification list with deep links, 30-second
   polling.
4. Stretch, only if time allows: Web Push with VAPID and a service worker behind WEB_PUSH_ENABLED.

Tests
- Finalising the G bill creates exactly four bill_ready notifications with the F9 text; replaying the
  event creates none.
- Nobody can read another person's notifications.

Done when: tests pass and Asha sees "bill ready", which opens her bill route (a placeholder until P17).
```

### P16 · Payments backend

`Needs:` P15

```text
PACT · P16 — Payments backend
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D8, D9, M5, M6, M7, S, F8, F9.

Build (apps/api)
1. A PaymentGateway interface: create_order, verify_webhook(raw_body, headers), parse_event,
   fetch_status. Two implementations: MockGateway (the default) and RazorpayGateway (test mode). For
   Razorpay, follow its current documentation for Orders, Checkout and webhook signatures; do not guess
   header or field names.
2. The F8 endpoints: pay, webhook, verify, list invoices, get invoice.
3. Webhook processing exactly as F8 step 3, in one transaction with row locks.
4. The dev-only mock checkout page with its four buttons.

Tests
- Happy path. Failure then a successful retry. The same webhook delivered five times → one payment, one
  notification.
- Bad signature → 400 and nothing changes. Wrong amount → not paid, flagged.
- Returning from checkout, alone, never marks anything paid.
- A second success for an already-paid invoice → needs_refund; the invoice is unchanged.
- Chitra can neither view nor pay Asha's invoice (404). A void invoice cannot be paid.
- A webhook and a verify call racing each other → exactly one transition.

Done when: tests pass on MockGateway, and Razorpay works when test keys are present.
```

### P17 · Customer "My bill" and payment screens

`Needs:` P10, P16

```text
PACT · P17 — Customer "My bill" and payment screens
Open README.md. Read Part 1 (Core) and follow C7. Then read only: F8, U6, U7, U9, and in U8 the rows
Home, My bill, Payment result.

Build (apps/web) — kit components only
1. Home's main card gains its remaining states: sent to the store, being packed, bill ready with the
   amount and Pay, paid, on the way, delivered, and order rejected.
2. /customer/bills and /customer/bills/{id} to the U8 "My bill" blueprint.
3. Paying: Pay → gateway checkout (the mock page, or Razorpay Checkout) → "Checking your payment…",
   which polls the invoice and calls verify once after 10 seconds → Paid with a receipt, or Didn't go
   through with Try again. Never show Paid on the strength of the redirect alone.
4. A delivery status line on paid bills.

Done when
- Playwright: Asha pays ₹720 through the mock gateway and sees Paid; a failed attempt shows Try again
  and then succeeds.
- A short-packed item reads "Asked 1 · Packed 0 · Not available this month" and is not charged.
- U9 holds at 360 px.
```

## Stage 6 · Dashboards and delivery

### P18 · Retailer dashboard and collection

`Needs:` P14, P16

```text
PACT · P18 — Retailer dashboard and payment collection
Open README.md. Read Part 1 (Core) and follow C7. Then read only: F10, U6, U7, U9, and in U8 the rows
Dashboard, Payments.

Build
1. API: the three F10 endpoints with exactly the F10 metric definitions, as SQL aggregates over real
   rows. No stored counters. No invented numbers.
2. Web /retailer: the stat cards, incoming orders, low-stock list, sales and order history.
3. Web /retailer/payments: the ProgressBar with its written label, paid and unpaid counts, the
   per-customer table with status and transactions, and the D8 settlement line.

Tests
- G after Asha, Bharat and Dev pay: ₹1,890 of ₹2,250 received, 84%, 3 paid, 1 unpaid, ₹360 pending.
- Sales count only paid invoices, placed in the month of paid_at in IST. Growth is null, shown "—",
  when last month is 0.
- Farah's dashboard is unaffected by anything of Ravi's.

Done when: tests pass and the figures move as mock payments arrive.
```

### P19 · Admin dashboard, reminders and delivery

`Needs:` P16

```text
PACT · P19 — Community admin: dashboard, reminders and delivery
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D9, D10, M7, S, F9, F11, U6, U7, U9,
and in U8 the Admin rows.

Build
1. API: the F11 endpoints, all scoped by the admin's building: overview, paid list, unpaid list,
   handover list, reminders with the hourly limit, advancing delivery, delivery history.
2. No endpoint lets an admin change a payment status.
3. Web /admin to the U8 blueprint: stat cards; Paid (n) and Unpaid (n); one next-step button per paid
   row; "Send reminder" and "Remind all unpaid (n)" with confirmation. Equally good on a phone.

Tests
- G: Paid lists Asha, Bharat and Dev. Unpaid lists Chitra with ₹360 due.
- A reminder creates the F9 notification and records sent_by; a second within the hour is skipped and
  reported as skipped.
- Delivery moves paid → ready → on the way → delivered, in order only, each step recording who and
  when. "On the way" sends the F9 delivery text. An unpaid invoice can never enter delivery.
- Meera cannot see Lakeview. Nikhil cannot see Green Meadows.

Done when: tests pass. The whole monthly loop now works in text mode.
```

## Stage 7 · Voice

### P20 · Voice interpretation API

`Needs:` P09

```text
PACT · P20 — Voice order interpretation API
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D15, M2, F3, G.

Build (apps/api/app/modules/voice)
1. normalise(text, language) using the F3 tables, held as data.
2. parse(text) → segments of quantity, unit and product phrase.
3. match(segment, community): the F3 matching rules, restricted to the caller's visible catalogue, then
   the F3 variant rule.
4. POST /voice/interpret returning the F3 response shape. It never writes to the cart.
5. Keep it behind an Interpreter interface so an LLM adapter could be added later. Do not add one.

Tests
- Asha's G sentence → rice 5 kg × 1, sugar 1 kg × 2, sunflower oil 1 L × 1, toor dal 500 g × 1, all
  matched.
- The same sentence for Esha → rice is ambiguous with two options; the rest match.
- "पाँच किलो चावल और दो किलो चीनी" and "paanch kilo chawal aur do kilo cheeni" give the same result
  as the English.
- Missing quantity, unknown product, a unit that does not fit, an amount no pack divides → the right
  status and a question, never a silent guess.
- A table-driven suite of at least 40 phrases across both languages.

Done when: tests pass.
```

### P21 · Voice ordering screen

`Needs:` P10, P20

```text
PACT · P21 — Voice ordering screen
Open README.md. Read Part 1 (Core) and follow C7. Then read only: F3, U6, U7, U9, and in U8 the row Speak.

Build (apps/web) — kit components only
1. useSpeech(): wraps the browser SpeechRecognition API (en-IN and hi-IN, interim results) and
   speechSynthesis; exposes supported, listening, transcript and error. It replaces the P05 stub.
2. /customer/speak to the U8 blueprint, through to "Add to my list" → POST /cart/items:batch with
   source "voice".
3. The F3 fallbacks: the screen carries on with typing, and nothing heard or typed is lost.
4. Nothing reaches the cart without the confirm step.

Done when
- Playwright with a mocked speech API: Asha's G sentence → four lines → confirm → they appear in My list.
- With recognition unavailable, typing the sentence gives the same result.
- U9 holds, and the mic's state is announced to screen readers.
```

### P22 · Voice sign-in

`Needs:` P21

```text
PACT · P22 — Voice sign-in
Open README.md. Read Part 1 (Core) and follow C7. Then read only: F1, F3 (fallback), U6, U7, U9, and in
U8 the rows Sign-in, Join.

Build (apps/web)
1. In /login "Speak" mode, the F1 voice flow: one question at a time, spoken and written. New residents
   continue by voice through building code, name and flat.
2. Spoken digits understood in English and Hindi, including "double five". The fields stay visible and
   editable throughout.
3. Voice only fills the form. The server-side code check is unchanged. Never ask for a password. Never
   read the code aloud.
4. Any speech failure switches to typing, keeping what was captured.

Done when
- Playwright with mocked speech: Asha signs in entirely by voice; then again with the mic denied,
  finishing by typing.
- Sign-in mode and ordering mode stay independent: voice sign-in followed by Type & tap ordering works.
```

## Stage 8 · Scale-out

### P23 · Kafka event transport

`Needs:` P19

```text
PACT · P23 — Kafka event transport (Aiven)
Open README.md. Read Part 1 (Core) and follow C7. Then read only: M7, F9, F12.

Build
1. docker-compose: a single-node Kafka (KRaft) for local use.
2. EVENT_TRANSPORT=kafka: the outbox relay publishes each event to its F12 topic, keyed as F12 says,
   and marks it published only after the broker acknowledges.
3. A consumer worker (python -m app.workers.consumer) running the existing handlers from Kafka, using a
   new processed_events table to make redelivery harmless.
4. Aiven connection settings from environment (SSL: CA, certificate, key). A topic-creation script.
5. The inline transport keeps working unchanged, and tests use it by default.

Tests
- With Kafka running: finalising the G bill produces four bill_ready notifications through the consumer;
  replaying the topic from the start creates no duplicates.
- With the broker down: business transactions still commit, events wait in the outbox, and are delivered
  after recovery.
- No code path reads stock, payment or order state from Kafka.

Done when: tests pass on both transports.
```

### P24 · OpenSearch product search

`Needs:` P08

```text
PACT · P24 — OpenSearch product search (Aiven)
Open README.md. Read Part 1 (Core) and follow C7. Then read only: D13, F2, F13.

Build
1. docker-compose: a single-node OpenSearch for local use.
2. The pact-products index as F13 describes; a full reindex command; incremental updates driven by
   catalogue.product_changed.
3. OpenSearchBackend implementing the P08 SearchBackend (SEARCH_BACKEND=opensearch). It returns ranked
   product ids only; visibility, price and availability still come from PostgreSQL.
4. If OpenSearch cannot be reached, fall back to the PostgreSQL backend and log it.
5. Aiven connection settings from environment.

Tests
- Typos and transliteration: "sunflowr oil", "chawal", "चावल", "toor dhal" find the right products.
- A product the caller's store does not list never appears, although it is in the index.
- The fallback works with OpenSearch stopped.
- The whole P08 test suite passes unchanged on both backends.

Done when: tests pass.
```

## Stage 9 · Harden and ship

### P25 · Security, privacy and UX hardening

`Needs:` P19 (and P22, P24 if built)

```text
PACT · P25 — Security, privacy and UX hardening
Open README.md. Read Part 1 (Core) and follow C7, treating C4 as a checklist. Then read only: X, U6, U9.

Build
1. An access-matrix test that calls every API route as every G person and checks the status against an
   explicit table. A route with no entry in the table fails the test.
2. Leak tests: no customer response identifies a store; no customer response holds another resident's
   lines; no retailer response holds a phone number.
3. A test proving every R14 action writes an audit row. Rate limits on code, pay and reminder endpoints.
   Secure cookie flags, CORS locked to the web origin, security headers, request-size limits, raw-body
   handling for webhooks.
4. Optional defence in depth: PostgreSQL Row-Level Security on store-owned tables, keyed by a
   per-transaction setting.
5. A UX pass over every screen: the U9 checklist, an axe run in Playwright for each main route, a check
   at 360 px and at 200% zoom, and a copy check against U7.
6. A scope check: confirm nothing from X exists.

Done when: every new test passes, and a short list of findings (fixed, deferred) is in the tracker notes.
```

### P26 · End-to-end demo and deployment

`Needs:` P19

```text
PACT · P26 — End-to-end demo and deployment
Open README.md. Read Part 1 (Core) and follow C7. Then read only: G.

Build
1. One Playwright spec that plays all of G through the interface: four residents order → lock-now → Ravi
   accepts, packs, discounts and finalises → three residents pay through the mock gateway → Meera
   reminds Chitra and delivers to the others. Assert every amount in G.
2. make demo: reset the dev database, seed it, and leave the app at the start of G. make demo-fast also
   plays G through the API up to "bill ready".
3. Deployment: Vercel for web; Render for the API, a worker, and a 5-minute cron for the cycle tick, via
   render.yaml; Aiven PostgreSQL (and Kafka and OpenSearch if P23 and P24 are done). Migrations run on
   deploy. Document every environment variable for every service.
4. Production safety: the dev code, the dev endpoints and the mock gateway cannot be enabled when
   APP_ENV=production; the API refuses to start.
5. Fill in "Deploy it" in Part 4 of README.md.

Done when: the spec passes locally from a clean clone, and the deployed site completes G in test mode.
```

---

# Part 4 · Build tracker

Agents: tick your row and add at most two lines of notes. Humans: this is your progress bar.

| # | Prompt | Done | Notes (deviations, new env vars, new commands) |
|---|---|:---:|---|
| P00 | Scaffold and tooling | ☑ | Monorepo scaffold, PostgreSQL 16 docker, FastAPI health check with DB ping, Makefile |
| P01 | Database schema | ☐ | |
| P02 | Seed data and golden fixture | ☐ | |
| P03 | Sign-in, access guards and plumbing | ☐ | |
| P04 | Design system and UI kit | ☑ | U1–U9 tokens in globals.css + Tailwind theme, 22 kit components, format.ts unit tests, /styleguide, check-hex tool |
| P05 | App shells and sign-in screens | ☑ | F1 login with OTP & resend timer, onboarding (resident/store), route guards, four workspace shells (Customer, Retailer, Admin, Platform) |
| P06 | Store onboarding and inventory API | ☐ | |
| P07 | Retailer inventory screens | ☐ | |
| P08 | Customer catalogue API | ☐ | |
| P09 | Shared cart and monthly cycle API | ☐ | |
| P10 | Customer shop and "My list" screens | ☐ | |
| P11 | Cutoff and bulk order | ☐ | |
| P12 | Bill-splitting engine | ☐ | |
| P13 | Retailer order processing API | ☐ | |
| P14 | Retailer order, packing and billing screens | ☐ | |
| P15 | Notifications | ☐ | |
| P16 | Payments backend | ☐ | |
| P17 | Customer "My bill" and payment screens | ☐ | |
| P18 | Retailer dashboard and collection | ☐ | |
| P19 | Admin dashboard, reminders and delivery | ☐ | |
| P20 | Voice interpretation API | ☐ | |
| P21 | Voice ordering screen | ☐ | |
| P22 | Voice sign-in | ☐ | |
| P23 | Kafka event transport | ☐ | |
| P24 | OpenSearch product search | ☐ | |
| P25 | Security, privacy and UX hardening | ☐ | |
| P26 | End-to-end demo and deployment | ☐ | |

### Run it

```bash
# 1. Start database in Docker (PostgreSQL 16)
make db

# 2. Run backend test suite (against real PostgreSQL test database with per-test rollback)
make test

# 3. Run linters (ruff on backend, eslint on web)
make lint

# 4. Start full development environment (Postgres, API on port 8000, Web on port 3000)
make dev
```

### Deploy it

*Filled in by P26.*

---

## Appendix · Where the specification went

For anyone holding the original *PACT Complete Project Summary & Functional Specification*.

| Spec § | Topic | In this manual | Built by |
|---|---|---|---|
| 1 | Product vision and operating model | C1, C2 | — |
| 2 | Roles and access boundaries | C3, R1–R4 | P03, P25 |
| 3 | Customer login and ordering mode | F1 | P03, P05, P22 |
| 4 | Unified grocery catalogue | F2 | P02, P08, P10 |
| 5 | Voice-based ordering | F3 | P20, P21 |
| 6 | Shared community cart and monthly cycle | F4 | P09, P10, P11 |
| 7 | Retailer workspace and inventory | F5, F10 | P06, P07, P18 |
| 8 | Acceptance, packing and final billing | F6 | P13, P14 |
| 9 | Individual bill splitting | F7 | P12 |
| 10 | Customer payment experience | F8, F9 | P15, P16, P17 |
| 11 | Retailer payment dashboard | F10 | P18 |
| 12 | Admin dashboard and delivery | F11 | P19 |
| 13 | Data model and technical architecture | M, C5, F12, F13 | P01, P23, P24 |
| 14 | Business rules and edge cases | C4, D | every prompt; P25 |
| 15 | Removed features and GSTIN scope | X, F14 | P06 |
| 16 | Decisions still to be confirmed | D | — |
| — | Design system ＋ | U1–U9 | P04, then every screen prompt |
