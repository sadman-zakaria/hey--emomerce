# Maison API

Node.js REST API for the Maison storefront and admin dashboard. It is a standalone
Express 5 application with JWT authentication, Zod validation, and two storage
backends:

| Storage | When it is used | Persistence |
| --- | --- | --- |
| MongoDB (Mongoose) | `MONGODB_URI` is set | Durable |
| In-memory demo store | `MONGODB_URI` is empty | Lost on restart |

The API is designed to deploy to **Vercel** or **Netlify** as a serverless
function, or to run as a normal long-lived Node process (Docker, Render, Railway,
a VPS, etc.). For any serverless deployment, configure MongoDB: in-memory data is
per-instance and will disappear.

## Local setup

```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

The API listens on `http://localhost:4000` by default.

- Health check: `GET http://localhost:4000/api/health`
- API index: `GET http://localhost:4000/`
- Seed data is inserted on first boot when `SEED_ON_START=true`.

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with file watching (`node --watch`) |
| `npm start` | Start the production server |
| `npm run seed` | Connect and seed without starting the HTTP server |
| `npm test` | Run the API test suite (uses the in-memory store) |

## Environment variables

All variables are optional locally; the defaults in `src/config/env.js` match the
frontend demo. In production, always set `MONGODB_URI`, `JWT_SECRET`,
`CORS_ORIGINS`, and the admin credentials.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | Ignored by serverless hosts |
| `MONGODB_URI` | empty | MongoDB connection string. Empty ⇒ in-memory store |
| `JWT_SECRET` | development secret | **Change in production.** Long random string |
| `JWT_EXPIRES_IN` | `7d` | Any `jsonwebtoken` expiry value |
| `ADMIN_NAME` | `Tanjina Irin` | Display name for the seeded admin |
| `ADMIN_EMAIL` | `tanjinairin62@gmail.com` | Login email for the seeded admin |
| `ADMIN_PASSWORD` | `tanjina1234` | Initial password; used only when the admin is seeded |
| `CORS_ORIGINS` | localhost origins | Comma-separated allowlist, or `*` |
| `FRONTEND_URL` | empty | Public storefront origin; added to the CORS allowlist automatically |
| `SEED_ON_START` | `true` | Set to `false` to skip demo seeding |

The admin account is created on first boot. If the account already exists, the
password is **not** overwritten by `ADMIN_PASSWORD`; change an existing password
through the admin **Admins** page, or delete the admin user and redeploy to re-seed
it. Changing `ADMIN_EMAIL` creates a second admin rather than renaming the first.
After the initial seed, a marker is stored so demo records are not recreated if you
delete them later.

## API overview

Base URL: `/api`. JSON is used for all request and response bodies. Send the admin
token as `Authorization: Bearer <token>`.

### Public

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Service metadata and endpoint index |
| `GET` | `/api/health` | Health check; includes storage mode |
| `POST` | `/api/auth/login` | Customer login `{ email, password }`; returns `{ token, user }` |
| `POST` | `/api/auth/admin/login` | Admin-only login; rejects non-admin accounts with `403` |
| `POST` | `/api/auth/register` | Create a customer account `{ name, email, password }` |
| `GET` | `/api/auth/me` | Current user (requires token) |
| `POST` | `/api/auth/logout` | No-op token revocation; returns `{ ok: true }` |
| `GET` | `/api/auth/config` | Public storefront config (storage mode) |
| `GET` | `/api/account/orders` | Signed-in customer's order history (requires token) |
| `PATCH` | `/api/account/profile` | Update the signed-in customer's name |
| `GET` | `/api/products` | Paginated active products |
| `GET` | `/api/products/:slug` | Product by slug |
| `GET` | `/api/categories` | Categories with product counts |
| `GET` | `/api/banners` | Active banners ordered for display |
| `GET` | `/api/bootstrap` | Products, categories, and banners in one call |
| `POST` | `/api/orders` | Place a guest cash-on-delivery order |
| `GET` | `/api/orders/:orderNumber?email=` | Guest order lookup |

Product list query parameters: `q`, `category`, `featured`, `tags` (comma
separated), `minPrice`, `maxPrice`, `sort` (`featured`, `newest`, `price-asc`,
`price-desc`, `rating`), `page`, `limit`.

Place an order:

```json
{
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "customerPhone": "+1 555 0100",
  "shippingAddress": "12 Example Street",
  "city": "Springfield",
  "zipCode": "12345",
  "notes": "Leave at the door",
  "items": [{ "productId": "<product id>", "quantity": 2 }]
}
```

Pricing is calculated on the server from current product prices. Shipping is free
for subtotals of `$100` or more, otherwise `$9.99`. Stock is validated for every
line item and decremented as the order is created; if any step fails, the stock
already reserved for that order is restored. Orders start as `pending` with
`paymentMethod: "cash_on_delivery"` and `paymentStatus: "unpaid"`. Updating an
order to `delivered` marks it `paid`; moving it to `cancelled` (including after
delivery) marks it `unpaid` again and restores stock.

### Admin (JWT + `role: "admin"` required)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/admin/stats` | Revenue, counts, low stock, recent orders, status totals |
| `GET` | `/api/admin/products` | All products, including drafts/archived |
| `GET` | `/api/admin/products/:id` | Single product by ID |
| `POST` | `/api/admin/products` | Create a product |
| `PATCH` | `/api/admin/products/:id` | Update a product |
| `DELETE` | `/api/admin/products/:id` | Delete a product |
| `GET` | `/api/admin/categories` | List categories |
| `POST` | `/api/admin/categories` | Create a category |
| `PATCH` | `/api/admin/categories/:id` | Update a category |
| `DELETE` | `/api/admin/categories/:id` | Delete a category |
| `GET` | `/api/admin/banners` | List all banners |
| `POST` | `/api/admin/banners` | Create a banner |
| `PATCH` | `/api/admin/banners/:id` | Update a banner |
| `DELETE` | `/api/admin/banners/:id` | Delete a banner |
| `GET` | `/api/admin/orders` | List/search orders |
| `GET` | `/api/admin/orders/:id` | Order by ID |
| `PATCH` | `/api/admin/orders/:id/status` | Body `{ status }` |
| `GET` | `/api/admin/users` | List/search users; filter with `?role=admin` or `?role=customer` |
| `POST` | `/api/admin/users` | Create a user or admin (admins require a password) |
| `PATCH` | `/api/admin/users/:id` | Update a user, role, status, or password |
| `DELETE` | `/api/admin/users/:id` | Delete a user/admin (not yourself; last admin is protected) |
| `GET` | `/api/admin/media` | List uploaded media |
| `POST` | `/api/admin/media` | Upload media `{ name, dataUrl }` (base64 image, max ~6 MB) |
| `DELETE` | `/api/admin/media/:id` | Delete a media item |

Order statuses: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`.
Cancelling an order restores the stock of its line items. Product and category
slugs are generated from `slug` or `name` and must be unique.

Admins cannot demote or delete their own account, and the API refuses to remove or
demote the last remaining admin. Duplicate emails return `409`.

Validation failures return `400`/`422`; conflicts (duplicate email/slug, insufficient
stock) return `409`; authentication and authorization failures return `401`/`403`.

## Deploy to Vercel

1. Push the repository to GitHub (or use the Vercel CLI).
2. Import the project in Vercel and set **Root Directory** to `backend`.
3. Framework preset: **Other**. Leave the build command empty; Vercel uses the
   Express app exported from `api/index.js`.
4. Add the environment variables from the table above. At minimum:
   `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `CORS_ORIGINS=https://your-frontend-domain`, and
   `FRONTEND_URL=https://your-frontend-domain`.
5. Deploy and verify `https://<project>.vercel.app/api/health` reports
   `"mode": "mongo"`.

`backend/vercel.json` routes every path into the serverless entry point, so the
Express app keeps its `/api/...` paths.

## Deploy to Netlify

1. Import the repository and set **Base directory** to `backend`.
2. Build command: `npm install` is enough. Publish directory: `public`.
3. Netlify uses `netlify.toml`, which bundles
   `netlify/functions/api.js` with `esbuild` and redirects `/api/*` to it.
4. Add the same environment variables in **Site configuration → Environment
   variables**.
5. Deploy and verify `https://<site>.netlify.app/api/health`.

You can also deploy from the CLI:

```bash
cd backend
npm install
npx netlify deploy --prod
```

## MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with a strong password.
3. Under **Network Access**, allow your serverless host. Vercel and Netlify use
   dynamic IPs, so allow `0.0.0.0/0` during setup and restrict it later if your
   plan supports static egress IPs.
4. Copy the driver connection string and append a database name, for example:
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/maison?retryWrites=true&w=majority`
5. Set it as `MONGODB_URI` and restart the API. Collections and the admin account
   are created automatically on first boot.

Use a different database per environment (for example `maison-dev` and
`maison-prod`) so demo seeding never touches production data.

## Connecting the frontend

The storefront reads `VITE_API_URL` at build time. In development it falls back to
`http://localhost:4000/api`; in production it falls back to `/api` (same-origin).
If the frontend and API are deployed separately, set:

```env
VITE_API_URL=https://your-api-domain/api
```

Then add the frontend origin to `CORS_ORIGINS` on the API. Rebuild the frontend
after changing `VITE_API_URL`, because Vite inlines it into the bundle.

When the API is unreachable, the admin screen falls back to an **Offline demo
mode** that accepts the demo credentials and keeps data in `localStorage`. This is
a convenience for previewing the UI and is not a substitute for the backend.

## Security notes

- Replace `JWT_SECRET` and the default `ADMIN_PASSWORD` before going live.
- Admin and customer sessions use separate JWT-bearing storage keys and separate
  login endpoints; the admin API requires `role: "admin"` on every request.
- Tokens are held in `localStorage`, which is readable by any script on the page.
  Keep dependencies patched and avoid untrusted scripts; for higher-security
  deployments, move authentication to HttpOnly cookies.
- Login is rate limited (20 attempts per 15 minutes per IP). Customer registration
  is limited to 10 accounts per hour per IP.
- Passwords are hashed with bcrypt before storage and are never returned by the
  API. Admin management rejects self-demotion, self-deletion, and removal of the
  last admin.
- Media uploads must be base64 PNG/JPEG/WebP/GIF/AVIF under roughly 6 MB; the JSON
  body limit is 8 MB.
- CORS is an allowlist. Do not use `*` with credentials in production.
- The API is cash-on-delivery only; no card data is handled. Add a payment
  provider before accepting online payments.
- Demo seeding runs once and records a seed marker, so deleted demo records are not
  recreated. Set `SEED_ON_START=false` for a clean production database, then create
  the admin account before disabling it if you need one.
- Run behind HTTPS. Both Vercel and Netlify provide it automatically.
