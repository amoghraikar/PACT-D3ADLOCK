# PACT

**Collective commerce for apartment communities.**

Residents shop together, the retailer fulfils one consolidated order, and costs are split fairly — all in one platform.

---

## What It Does

- **Customers** browse a shared grocery catalogue, add items to a monthly group cart, and use voice ordering (English / Hindi)
- **Retailers** receive consolidated orders, manage inventory, pack items, generate bills, and push them to individual customers
- **Admins** track payments, deliveries, and collection dashboards

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS, TypeScript |
| Backend | FastAPI, Python 3.11+ |
| Persistence | In-memory + JSON flat-files (dev) |
| Auth | OTP-based, session tokens |
| Voice | NLP — en-IN, hi-IN |

---

## Features

- Monthly group cart with cutoff cycle
- 60+ grocery products across 12 categories
- Retailer order management (accept / reject / pack)
- Automatic bill splitting per household
- Retailer-triggered bill unlock (customers see final bill only after retailer sends it)
- Payment tracking and invoices
- Admin dashboard for collection metrics
- Voice ordering in English and Hindi
- Real-time cross-role sync (customer ↔ retailer)

---

## Project Structure

```
PACT/
├── apps/
│   ├── api/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   ├── cart/
│   │   │   ├── catalogue/
│   │   │   ├── retailer/
│   │   │   ├── admin/
│   │   │   ├── payments/
│   │   │   ├── notifications/
│   │   │   └── voice/
│   │   └── tests/
│   └── web/          # Next.js frontend
│       └── src/app/
│           ├── customer/
│           ├── retailer/
│           ├── admin/
│           └── login/
└── README.md
```

---

## Run Locally

**Terminal 1 — Backend**
```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend**
```bash
cd apps/web
npm install
npm run dev
```

App runs at **http://localhost:3000** · API docs at **http://localhost:8000/docs**

---

## Demo Accounts

| Role | Phone | OTP |
|---|---|---|
| Customer (Asha) | `+919999900001` | `000000` |
| Retailer (Ravi) | `+919999900021` | `000000` |
| Admin (Meera) | `+919999900031` | `000000` |

Or switch persona via API:
```bash
curl -X POST http://localhost:8000/api/v1/auth/switch-persona \
  -H "Content-Type: application/json" \
  -d '{"persona": "ravi"}'
```

---

## Key Routes

| URL | Description |
|---|---|
| `/customer/shop` | Browse catalogue and add to cart |
| `/customer/speak` | Voice ordering |
| `/customer/bill` | View final bill (unlocked by retailer) |
| `/retailer/orders` | View and manage consolidated orders |
| `/retailer/inventory` | Stock and product management |
| `/retailer/payments` | Payment collection |
| `/admin` | Admin dashboard |
| `/login` | OTP login |

---

## Tests

```bash
cd apps/api
source .venv/bin/activate
pytest tests/ -v
```

45 tests across auth, cart, billing, orders, payments, voice, and notifications.

---

## Deploy

| Service | Platform | Notes |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Set `NEXT_PUBLIC_API_URL` to your API URL |
| Backend | [Render](https://render.com) | Set `FRONTEND_URL` for CORS |

---

## License

MIT
