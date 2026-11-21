# Maison

A curated-homeware e-commerce storefront with a full admin dashboard. The
storefront is built with TanStack Start, React 19, TypeScript, and Tailwind CSS;
the API is a standalone Node.js/Express service with MongoDB persistence and
JWT-based admin authentication.

## What is included

- Storefront: home, shop with filters, categories, product pages with Add to cart
  and Order now, related products, icon-only search with a sticky live-results
  overlay, cart, guest checkout, order confirmation, about, and contact pages.
- Customer accounts at `/account`: register or sign in, then see every order
  placed with that email. Customer and admin sessions use separate tokens.
- Admin dashboard at `/admin` (hidden URL): revenue/order stats, products,
  categories, banners, media library, orders with payment status, customers, and
  admin management.
- Media library: upload images once, then pick them for products, categories, and
  banners. Images are compressed in the browser and stored with the record.
- Cash-on-delivery checkout with server-side pricing, stock validation, and stock
  rollback if an order fails. Delivered orders are marked paid; cancelled orders
  return to unpaid.
- Backend API with Zod validation, error handling, rate-limited login and
  registration, and either MongoDB or an in-memory demo store.
- Deploy configs for Vercel and Netlify in `backend/`.

## Project layout

```text
src/                  TanStack Start frontend
  lib/api.ts          API client and token storage
  lib/store.ts        Storefront state, admin auth, offline fallback
  routes/             Pages, including admin.tsx and admin/*.tsx
backend/              Express API (see backend/README.md)
  src/                App, routes, repositories, services, validation
  api/index.js        Vercel serverless entry
  netlify/functions/  Netlify serverless entry
```

## Local development

Requirements: Node.js 20+ and npm. The backend uses npm; the frontend works with
npm or Bun.

### 1. Start the API

```bash
cd backend
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm run dev
```

The API runs at `http://localhost:4000`. Without `MONGODB_URI` it uses an
in-memory seeded store, which is fine for local development and resets on
restart. See [backend/README.md](backend/README.md) for MongoDB Atlas setup and
deployment instructions.

### 2. Start the storefront

From the repository root:

```bash
npm install
npm run dev
```

Open the URL printed by Vite (commonly `http://localhost:8080`). In development
the frontend calls `http://localhost:4000/api` by default. To point it elsewhere,
copy `.env.example` to `.env` and set:

```env
VITE_API_URL=http://localhost:4000/api
```

Restart the dev server after changing the value.

### 3. Sign in to the admin dashboard

Open `/admin` (the URL is not linked from the storefront) and use:

```text
Email:    tanjinairin62@gmail.com
Password: tanjina1234
```

These are the defaults from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Override them in
`backend/.env` before deploying. The frontend also has an offline demo fallback
with the same credentials when the API cannot be reached; data saved in that mode
stays in the browser and is not sent anywhere.

Once signed in, open **Admins** to create or remove other admin accounts (name,
email, password, and confirm password). Admins cannot demote or delete their own
account, and at least one admin must remain.

Customer accounts are separate: open `/account` to register or sign in. Orders
placed while signed in — or with the same email as the account — appear in the
customer's order history.

## Scripts

Frontend (repository root):

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check |

Backend (`backend/`):

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with file watching |
| `npm start` | Start the API |
| `npm run seed` | Seed the configured database |
| `npm test` | Run the API tests |

## Deployment

The frontend and API can be deployed separately or on the same host.

1. Deploy `backend/` to Vercel or Netlify using the included configs, and set at
   least `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `CORS_ORIGINS`, and `FRONTEND_URL`. Full steps: [backend/README.md](backend/README.md).
2. Build and deploy the frontend with `VITE_API_URL` set to the public API URL,
   for example `https://maison-api.vercel.app/api`.
3. Add the frontend origin to `CORS_ORIGINS` on the API.

`VITE_API_URL` is inlined at build time, so rebuild the frontend whenever it
changes. If the frontend and API share an origin, leave it unset to use `/api`.

## Notes

- Storage falls back to an in-memory demo repository when `MONGODB_URI` is empty.
  Do not use that mode on serverless hosts, where data is not persisted.
- Checkout is cash-on-delivery only. No payment provider is integrated.
  `paymentStatus` is `unpaid` for pending, confirmed, shipped, and cancelled
  orders, and `paid` once an order is delivered.
- Demo seeding runs once. After the first successful boot a seed marker is stored,
  so deleting demo products will not recreate them on restart or cold start. Set
  `SEED_ON_START=false` for a production database that should never be seeded.
- The API returns JSON errors as `{ "error": "message" }`; validation errors can
  include a `details` field.
