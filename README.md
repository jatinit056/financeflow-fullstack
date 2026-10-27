# FinanceFlow

**A personal finance and expense dashboard: log income and spending, set a monthly budget, and see where every rupee goes.**

[![CI](https://github.com/YOUR-GITHUB-USERNAME/financeflow-fullstack/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR-GITHUB-USERNAME/financeflow-fullstack/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-149eca)
![Node.js](https://img.shields.io/badge/Node.js-22-5fa04e)
![Express](https://img.shields.io/badge/Express-5-333)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma_7-336791)
![License](https://img.shields.io/badge/license-MIT-green)

![FinanceFlow dashboard](docs/screenshots/dashboard.png)

|                |                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **Live demo**  | **https://YOUR-GITHUB-USERNAME.github.io/financeflow-fullstack/** (click **Explore the demo**, no sign-up) |
| **Source**     | https://github.com/YOUR-GITHUB-USERNAME/financeflow-fullstack                                              |
| **Full stack** | Express + PostgreSQL API, deployable to Render + Neon + Vercel ([guide](#production-deployment))           |

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Database schema](#database-schema)
- [API documentation](#api-documentation)
- [Environment variables](#environment-variables)
- [Local setup](#local-setup)
- [Database migrations](#database-migrations)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Screenshots](#screenshots)
- [Live demo](#live-demo)
- [GitHub repository](#github-repository)
- [Security](#security)
- [Future improvements](#future-improvements)
- [Interview guide](#interview-guide)

---

## Overview

Most people know their salary but not where it goes. FinanceFlow is a full-stack web app that turns
everyday transactions into answers: _How much can I still spend this month? Which category eats my
money? Am I saving more than last month?_

It is a complete product, not a tutorial: a REST API with authentication, validation and per-user
authorization; a PostgreSQL schema with constraints and indexes; a responsive React dashboard with
charts; 157 automated tests; CI; and one-command deployment configs for Vercel, Render and Neon.

## Features

**Authentication**

- Register, log in, log out; passwords hashed with bcrypt
- JWT authentication with protected API routes and protected pages
- Persistent login: the session survives page reloads and is re-verified with the server on start-up
- Clear errors for wrong credentials, expired sessions and server downtime; brute-force rate limiting
- **One-click demo**: a private sandbox account filled with six months of sample data, deleted after 24 hours

**Dashboard**

- This month's **budget runway**: how much is left, a meter of budget used, a "today" marker that shows
  whether spending is running ahead of the calendar, and a safe daily spend
- Current balance, total income and total expenses (all-time and this month)
- Income vs expenses chart for the last six months
- Expense breakdown by category and the most recent transactions

**Transactions**

- Add, edit and delete (with a confirmation step) from a keyboard-friendly modal; press <kbd>N</kbd> anywhere
- Search (descriptions and category names), filter by type, category and date range, sort by date or amount
- Pagination with a live summary (income, expenses and net for the current filters)
- Filters live in the URL, so a filtered view can be bookmarked or shared
- **Export to CSV** with the same filters (Excel-friendly, protected against formula injection)

**Budgets**

- Set and update a budget for any month; browse past months
- Warnings at 80% and when a budget is exceeded: on the dashboard, on the budget page, and as a toast
  the moment an expense crosses the line
- Six-month budget history with status for each month

**Analytics**

- 3, 6 or 12-month views: monthly income and expenses, running balance trend, spending by category
- Headline figures (income, expenses, net saved, savings rate) and highlights (biggest category,
  largest expense, best month)
- Every chart on the Analytics page can switch to a table view

**Quality**

- Responsive from 360px phones to wide desktops; sidebar becomes a drawer on small screens
- Loading skeletons, empty states, error states with retry, toast notifications
- Accessible: semantic HTML, labelled controls, focus management in dialogs, visible keyboard focus,
  reduced-motion support; zero violations in an automated axe-core audit
- Indian number formatting throughout (₹1,65,248) and lakh/crore chart axes

## Tech stack

| Layer      | Technology                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| Frontend   | React 19, Vite 8, Tailwind CSS 4, React Router 8, Axios, Recharts 3, Lucide icons     |
| Backend    | Node.js 22, Express 5, REST, JWT (`jsonwebtoken`), `bcrypt`, Zod 4 validation         |
| Security   | Helmet, CORS allow-list, `express-rate-limit`, input validation, safe error responses |
| Database   | PostgreSQL, Prisma ORM 7 (with the `pg` driver adapter)                               |
| Testing    | Vitest, Supertest (API tests against a real PostgreSQL database)                      |
| Tooling    | ESLint 10, Prettier, GitHub Actions CI, Postman collection, Docker Compose            |
| Deployment | Vercel (frontend), Render (API), Neon (PostgreSQL)                                    |

## Architecture

```mermaid
flowchart LR
    Browser["React SPA<br/>(Vercel CDN)"] -- "HTTPS + JSON<br/>Authorization: Bearer &lt;JWT&gt;" --> API["Express 5 API<br/>(Render)"]
    API -- "Prisma 7 + pg pool<br/>TLS" --> DB[("PostgreSQL<br/>(Neon)")]
```

The frontend is a static single-page app served from Vercel's CDN. It talks to the API over HTTPS
with JSON. The API is stateless (no server sessions), so it can scale horizontally; all state lives in
PostgreSQL.

**Inside the API**, every request passes through the same pipeline:

```mermaid
flowchart LR
    R[Request] --> M["Helmet, CORS,<br/>JSON limit, rate limit"]
    M --> A["requireAuth<br/>verify JWT, load user"]
    A --> V["validate<br/>Zod schemas"]
    V --> C["Controller<br/>HTTP in and out"]
    C --> S["Service<br/>business logic"]
    S --> P[("Prisma<br/>PostgreSQL")]
    S -. throws .-> E["Error handler<br/>safe JSON error"]
```

- **Routes → controllers → services.** Controllers only translate HTTP to function calls; services hold
  the business logic and all database access, so they are easy to test and reuse (the dashboard
  reuses the budget service, for example).
- **Feature modules.** Each feature (`auth`, `transactions`, `budget`, `dashboard`, `analytics`) owns
  its routes, controller, service and validation schemas.
- **One error path.** Express 5 forwards errors thrown in async handlers to a central error handler,
  which maps known errors to status codes and hides everything else behind a generic 500.

**Inside the web app**: React Router handles routing with route-level code splitting; an
`AuthProvider` owns the session; a single Axios instance attaches the token and logs the user out on
any 401; a small `useApi` hook fetches data with request cancellation and keeps previous data on screen
while refreshing.

## Folder structure

```
financeflow/
├── client/                         React app (Vercel)
│   ├── src/
│   │   ├── api/                    Axios instance + one function per endpoint
│   │   ├── auth/                   AuthProvider, useAuth, ProtectedRoute, PublicOnlyRoute
│   │   ├── composer/               Global "add/edit transaction" modal + refresh signal
│   │   ├── toast/                  Toast notifications
│   │   ├── hooks/                  useApi, useDebouncedValue, useDocumentTitle, ...
│   │   ├── lib/                    Formatting (₹, dates), categories, errors
│   │   ├── components/
│   │   │   ├── layout/             App shell: sidebar, top bar, mobile nav
│   │   │   ├── ui/                 Button, Field, Modal, Panel, Pagination, ...
│   │   │   ├── charts/             Recharts charts, category bars, data tables
│   │   │   ├── transactions/       Form, list, filters, delete dialog
│   │   │   └── budget/             Budget runway meter, budget form
│   │   ├── pages/                  Dashboard, Transactions, Budget, Analytics, Login, Register, 404
│   │   ├── demo/                   In-browser API for the GitHub Pages demo (not in normal builds)
│   │   ├── router.jsx              Route tree (lazy-loaded pages)
│   │   └── main.jsx
│   ├── tests/                      Unit tests (formatting, dates, demo API)
│   ├── vercel.json                 SPA rewrites + security headers
│   └── vite.config.js              Dev proxy /api -> localhost:5000; GitHub Pages build mode
│
├── server/                         Express API (Render)
│   ├── prisma/
│   │   ├── schema.prisma           Data model
│   │   ├── migrations/             SQL migrations (committed)
│   │   └── seed.js                 Demo user with sample data
│   ├── src/
│   │   ├── config/env.js           Validated environment config (fails fast)
│   │   ├── lib/                    Prisma client, shared aggregate queries
│   │   ├── middleware/             auth, validate, rate limits, errors, logging
│   │   ├── modules/                auth, transactions, budget, dashboard, analytics
│   │   │   └── <feature>/          *.routes.js, *.controller.js, *.service.js, *.schemas.js
│   │   ├── utils/                  dates, money, csv, budget status, tokens, sample data
│   │   ├── app.js                  Express app factory (used by tests)
│   │   └── server.js               Starts HTTP server, graceful shutdown
│   └── tests/                      API + unit tests (Vitest + Supertest)
│
├── docs/                           Screenshots, Postman collection
├── .github/workflows/ci.yml        Lint + test + build on every push
├── .github/workflows/pages.yml     Deploys the live demo to GitHub Pages
├── docker-compose.yml              Local PostgreSQL (dev + test databases)
├── render.yaml                     Render Blueprint for the API
└── package.json                    Root scripts: dev, test, lint, format
```

## Database schema

```mermaid
erDiagram
    users ||--o{ transactions : "has many"
    users ||--o{ budgets : "has many"

    users {
        uuid id PK
        varchar(80) name
        varchar(255) email UK "stored lowercase"
        text password_hash "bcrypt"
        boolean is_demo
        timestamp created_at
        timestamp updated_at
    }
    transactions {
        uuid id PK
        uuid user_id FK "ON DELETE CASCADE"
        decimal(12_2) amount "CHECK amount > 0"
        enum type "INCOME | EXPENSE"
        enum category
        varchar(255) description "nullable"
        date date
        timestamp created_at
        timestamp updated_at
    }
    budgets {
        uuid id PK
        uuid user_id FK "ON DELETE CASCADE"
        smallint month "CHECK 1-12"
        smallint year
        decimal(12_2) amount "CHECK amount > 0"
        timestamp created_at
        timestamp updated_at
    }
```

| Design choice                                              | Why                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `DECIMAL(12,2)` for money                                  | Exact arithmetic; floats can't represent 0.1 exactly                         |
| `DATE` for transaction dates                               | A transaction happens on a calendar day; no time-zone drift                  |
| UUID v7 primary keys                                       | Not guessable like 1, 2, 3, but time-ordered, so B-tree indexes stay compact |
| `UNIQUE (user_id, year, month)` on budgets                 | One budget per user per month, enforced by the database                      |
| Indexes `(user_id, date DESC)` and `(user_id, type, date)` | Every query filters by user first, then by date or type                      |
| `ON DELETE CASCADE`                                        | Deleting a user removes their data (used to purge demo users)                |
| `CHECK` constraints                                        | Last line of defence behind the API's validation                             |
| Enums for type and category                                | Invalid values can't be stored                                               |

Categories: **Income**: Salary, Freelance, Investments, Other. **Expense**: Food & Dining, Transport,
Shopping, Bills & Utilities, Rent & Housing, Health & Fitness, Education, Entertainment, Other. The API
rejects a category that doesn't match the transaction type.

## API documentation

Base URL: `http://localhost:5000/api` locally, `https://<your-service>.onrender.com/api` in production.
Protected endpoints need `Authorization: Bearer <token>`. A ready-made Postman collection is in
[`docs/FinanceFlow.postman_collection.json`](docs/FinanceFlow.postman_collection.json): import it, run
**Auth > Login**, and every other request is authorised automatically.

| Method | Endpoint                           | Auth | Description                                                   |
| ------ | ---------------------------------- | :--: | ------------------------------------------------------------- |
| GET    | `/health`                          |      | Liveness check                                                |
| POST   | `/auth/register`                   |      | Create an account → `201 { user, token }`                     |
| POST   | `/auth/login`                      |      | Log in → `200 { user, token }`                                |
| POST   | `/auth/demo`                       |      | Start a sandbox demo session → `201 { user, token }`          |
| GET    | `/auth/me`                         |  ✓   | Current user                                                  |
| GET    | `/transactions`                    |  ✓   | List with search, filters, sorting, pagination                |
| POST   | `/transactions`                    |  ✓   | Create → `201 { transaction, budgetAlert }`                   |
| GET    | `/transactions/:id`                |  ✓   | One transaction                                               |
| PUT    | `/transactions/:id`                |  ✓   | Replace a transaction → `{ transaction, budgetAlert }`        |
| DELETE | `/transactions/:id`                |  ✓   | Delete → `204`                                                |
| GET    | `/transactions/export`             |  ✓   | Download filtered transactions as CSV                         |
| GET    | `/budget?year=&month=`             |  ✓   | Budget, spending, status, category breakdown, 6-month history |
| POST   | `/budget`                          |  ✓   | Set a month's budget → `201` (`409` if it exists)             |
| PUT    | `/budget`                          |  ✓   | Update a month's budget (`404` if none)                       |
| GET    | `/dashboard?year=&month=`          |  ✓   | Everything the dashboard shows, in one request                |
| GET    | `/analytics?months=6&year=&month=` |  ✓   | Monthly series, balance trend, categories, insights           |

`year` and `month` let the client send its **local** current month, because the server runs in UTC.

**`GET /transactions` query parameters** (all optional)

| Param                  | Values                                                    | Default         |
| ---------------------- | --------------------------------------------------------- | --------------- |
| `page`, `limit`        | `page ≥ 1`, `1 ≤ limit ≤ 100`                             | `1`, `10`       |
| `search`               | Matches description (case-insensitive) or category name   |                 |
| `type`                 | `INCOME` or `EXPENSE`                                     |                 |
| `category`             | e.g. `FOOD`, `SALARY`                                     |                 |
| `startDate`, `endDate` | `YYYY-MM-DD`, inclusive                                   |                 |
| `sortBy` / `sortOrder` | `date`, `amount`, `category`, `createdAt` / `asc`, `desc` | `date` / `desc` |

**Example: create an expense**

```http
POST /api/transactions
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{ "amount": 450.5, "type": "EXPENSE", "category": "FOOD", "description": "Lunch", "date": "2026-10-20" }
```

```json
{
  "transaction": {
    "id": "019a2f6c-3b1e-7c4d-9a51-6f0e2d7b8c90",
    "amount": 450.5,
    "type": "EXPENSE",
    "category": "FOOD",
    "description": "Lunch",
    "date": "2026-10-20",
    "createdAt": "2026-10-20T09:12:44.120Z",
    "updatedAt": "2026-10-20T09:12:44.120Z"
  },
  "budgetAlert": {
    "status": "warning",
    "year": 2026,
    "month": 10,
    "budget": 40000,
    "spent": 34100,
    "percentUsed": 85.3
  }
}
```

**Errors** always have the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be greater than 0",
    "details": [{ "field": "amount", "message": "Amount must be greater than 0" }]
  }
}
```

| Status | When                                                         |
| ------ | ------------------------------------------------------------ |
| `400`  | Validation failed, malformed JSON or id                      |
| `401`  | Missing, invalid or expired token; wrong credentials         |
| `403`  | Request from an origin that isn't allowed (CORS)             |
| `404`  | Route or resource not found (including other users' records) |
| `409`  | Email already registered; budget already set for that month  |
| `413`  | Request body over 10 kb                                      |
| `429`  | Too many requests (rate limited)                             |
| `500`  | Unexpected error (details are logged, never sent)            |

## Environment variables

**API** (`server/.env`, copy from [`server/.env.example`](server/.env.example))

| Variable             | Required  | Example                                                     | Purpose                                                                                                                          |
| -------------------- | :-------: | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       |     ✓     | `postgresql://postgres:postgres@localhost:5433/financeflow` | App's database connection (Neon: the **pooled** URL)                                                                             |
| `DIRECT_URL`         |           | Neon direct URL                                             | Used only by Prisma migrations (Neon: the URL **without** `-pooler`)                                                             |
| `JWT_SECRET`         |     ✓     | 64+ random characters                                       | Signs tokens. At least 32 characters or the server refuses to start                                                              |
| `JWT_EXPIRES_IN`     |           | `7d`                                                        | Token lifetime                                                                                                                   |
| `CLIENT_URL`         | ✓ in prod | `https://financeflow.vercel.app`                            | Allowed CORS origin(s), comma-separated                                                                                          |
| `PORT`               |           | `5000`                                                      | Render sets this automatically                                                                                                   |
| `NODE_ENV`           |           | `production`                                                | `development`, `test` or `production`                                                                                            |
| `BCRYPT_ROUNDS`      |           | `12`                                                        | Hashing cost                                                                                                                     |
| `TRUST_PROXY`        |           | `true`                                                      | Real client IP behind the host's proxy, for rate limiting. Render: `true` (its proxy puts the client IP first). Locally: `false` |
| `RATE_LIMIT_ENABLED` |           | `true`                                                      | Turn rate limiting off for load tests                                                                                            |
| `DEMO_MODE`          |           | `true`                                                      | Enables `POST /auth/demo`                                                                                                        |

Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

**Web app** (`client/.env.local` for local overrides, or Vercel project settings)

| Variable              | Example                                    | Purpose                                                               |
| --------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `VITE_API_URL`        | `https://financeflow-api.onrender.com/api` | API base URL in production. Leave empty locally (Vite proxies `/api`) |
| `VITE_DEV_API_TARGET` | `http://localhost:5000`                    | Where the dev server forwards `/api`                                  |
| `VITE_DEMO_ENABLED`   | `true`                                     | Set `false` to hide the demo button                                   |

`VITE_*` values are baked into the JavaScript at build time, so they must never contain secrets.

## Local setup

**Prerequisites:** Node.js **22.18+** (24 LTS recommended), Git, and a PostgreSQL database. For the database
pick one: Docker Desktop (easiest), a local PostgreSQL install, or a free [Neon](https://neon.tech)
project (no installation).

```bash
# 1. Get the code
git clone https://github.com/YOUR-GITHUB-USERNAME/financeflow-fullstack.git
cd financeflow-fullstack

# 2. Start Docker Desktop, then run the one-time setup. It checks your Node.js version,
#    creates server/.env (with a random JWT secret), installs all dependencies, starts
#    PostgreSQL in Docker (on port 5433, so it never clashes with another local PostgreSQL),
#    creates the tables and loads demo data.
npm run setup

# 3. Run the API and the web app together
npm run dev
```

Open **http://localhost:5173** and log in with `demo@financeflow.app` / `Demo@12345` (or click
**Explore the demo**). The API runs on **http://localhost:5000** (`/api/health` should return `ok`).

**Not using Docker?** Point `DATABASE_URL` in `server/.env` at any PostgreSQL database (a local
install or a free [Neon](https://neon.tech) project), then run the steps by hand:

```bash
node scripts/setup-env.mjs   # creates server/.env with a random JWT secret
npm run install:all
npm run db:generate          # generate the Prisma client
npm run db:migrate           # create the tables
npm run db:seed              # demo user: demo@financeflow.app / Demo@12345
npm run dev
```

**One-click setup in VS Code**

The repo ships VS Code tasks, so you can do everything from menus. Open the folder in VS Code, then
**Terminal → Run Task…** and pick:

1. **FinanceFlow: First-time setup** — installs dependencies, starts PostgreSQL in Docker (Docker
   Desktop must be running), creates the tables and loads the demo data. Run
   `node scripts/setup-env.mjs` once first if `server/.env` doesn't exist yet.
2. **FinanceFlow: Start app (API + web)** — runs both servers.
3. **FinanceFlow: Open in browser** — opens http://localhost:5173.

**Running each part separately**

```bash
# Backend (auto-restarts on changes)
cd server && npm run dev

# Frontend (hot reload)
cd client && npm run dev
```

**Useful scripts** (from the repository root)

| Command                     | Does                                    |
| --------------------------- | --------------------------------------- |
| `npm run dev`               | API + web app together                  |
| `npm test`                  | All tests (API needs the test database) |
| `npm run lint`              | ESLint for server and client            |
| `npm run format`            | Prettier for the whole repo             |
| `npm run build`             | Production build of the web app         |
| `npm run db:up` / `db:down` | Start / stop the Docker database        |

**Troubleshooting**

- **`Cannot find module …/src/generated/prisma/client.ts`**: the Prisma client hasn't been
  generated yet. Run `npm run db:generate` (setup does this for you).
- **`Bind for 0.0.0.0:5433 failed: port is already allocated`**: something else uses port 5433.
  Change the left-hand port in `docker-compose.yml` (for example `'5434:5432'`) and run
  `npm run setup` again; it updates `server/.env` to match.
- **Port 5173 is busy**: Vite moves to the next free port (5174…) and prints the address. Login
  still works because API calls go through Vite's proxy.
- **`[web] memory allocation of … bytes failed`**: the computer ran out of free memory while Vite
  was bundling dependencies on its first start. Close a few apps or browser tabs and run
  `npm run dev` again (later starts reuse the cached bundle and need much less memory).
- **Windows asks to allow Node.js through the firewall** when the API starts: either answer is
  fine for local use; the app only talks to `localhost`.

## Database migrations

Schema changes are versioned SQL files in `server/prisma/migrations`, committed to Git and applied in
order.

```bash
cd server
npx prisma migrate deploy   # apply pending migrations (CI, production, fresh clones)
npm run db:migrate          # after editing schema.prisma: create + apply a new migration (dev only)
npm run db:seed             # (re)create the demo user with sample data
npm run db:studio           # browse the data in Prisma Studio
```

`npm install` runs `prisma generate` automatically, which creates the typed Prisma client in
`server/src/generated` (ignored by Git). `npm run db:generate` re-creates it at any time.

## Testing

```bash
cd server && npm test     # 140 API + unit tests against the financeflow_test database
cd client && npm test     # 17 tests: formatting, dates and the in-browser demo API
```

API tests run against a **real PostgreSQL database**, not mocks: before the run, the schema is rebuilt
from the same migration files production uses, and every test starts with empty tables. As a safety
net the setup refuses to touch any database whose name doesn't contain `test`.

| Area              | What is tested                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Registration      | Success, hashed password, email normalisation, duplicate email (409), every validation rule      |
| Login             | Success, wrong password, unknown email gives an identical response, malformed JSON               |
| Protected API     | Missing / malformed / tampered / expired / forged / `alg:none` tokens, deleted users             |
| Transaction CRUD  | Create, read, update, delete, 404s, malformed ids, mass-assignment protection                    |
| Authorization     | One user can't read, update, delete, list or export another user's data                          |
| Validation        | Amounts, decimals, type/category pairs, impossible and future dates, query parameters            |
| Lists             | Pagination, filters, search, sorting, combined filters, totals                                   |
| Budgets & reports | Status thresholds, month boundaries, history across a year change, dashboard and analytics maths |
| Security          | CORS allow-list, security headers, body size limit, rate limiting (429), CSV formula injection   |

GitHub Actions ([`ci.yml`](.github/workflows/ci.yml)) runs linting, the API tests against a PostgreSQL
service container, the client tests and a production build on every push and pull request.

## Production deployment

The free tiers of all three services are enough. Deploy in this order: **database → API → web app**,
then connect them.

### 1. Database on Neon

1. Sign in at [neon.tech](https://neon.tech) and click **New project**. Pick region
   **AWS Asia Pacific (Singapore)** (closest to Render's Singapore region).
2. On the project dashboard click **Connect**. Copy two connection strings:
   - **Pooled** (host contains `-pooler`) → this is `DATABASE_URL`
   - **Direct** (turn _Connection pooling_ off) → this is `DIRECT_URL`
3. In both, change `sslmode=require` to `sslmode=verify-full` (same security, and it avoids a
   warning from the PostgreSQL driver).

### 2. API on Render

1. Push this repository to GitHub.
2. In [Render](https://dashboard.render.com): **New + → Blueprint**, connect GitHub and pick the
   repository. Render reads [`render.yaml`](render.yaml) and proposes the `financeflow-api` service.
3. Fill in the values it asks for:
   - `DATABASE_URL`: Neon pooled URL
   - `DIRECT_URL`: Neon direct URL
   - `CLIENT_URL`: put `http://localhost:5173` for now (you'll update it in step 4)

   `JWT_SECRET` is generated automatically.

4. Click **Apply**. The build installs dependencies, generates the Prisma client and runs
   `prisma migrate deploy`, which creates the tables in Neon.
5. When it's live, open `https://<service>.onrender.com/api/health`. You should see `"status":"ok"`.

### 3. Web app on Vercel

1. In [Vercel](https://vercel.com/new): **Add New → Project**, import the repository.
2. Set **Root Directory** to `client`. The framework is detected as Vite.
3. Add the environment variable `VITE_API_URL` = `https://<service>.onrender.com/api`.
4. Click **Deploy**. [`client/vercel.json`](client/vercel.json) makes deep links such as
   `/transactions` work on refresh.

### 4. Connect them

1. In Render → `financeflow-api` → **Environment**, set `CLIENT_URL` to your Vercel URL, for example
   `https://financeflow-fullstack.vercel.app` (no trailing slash; add more origins separated by commas).
2. Save; Render redeploys automatically.

### 5. Smoke test

Open the Vercel URL and check: register → log in → dashboard loads → add, edit and delete a transaction
→ set a budget → charts on Analytics → log out and back in → open on a phone. If something fails, the
browser console and Render's **Logs** tab show the reason (a CORS error means `CLIENT_URL` doesn't
exactly match the Vercel URL).

> **Free-tier note:** Render's free web services sleep after 15 minutes without traffic, so the first
> request after a pause can take up to a minute. The app shows a "waking up the server" message instead
> of failing. Neon also pauses idle databases and wakes them in about a second.

**Railway instead of Render?** Create a service from the repo, set the root directory to `server`,
build command `npm ci --include=dev && npm run build`, start command `npm start`, and the same
environment variables.

## Screenshots

| Dashboard                                                | Transactions                                       |
| -------------------------------------------------------- | -------------------------------------------------- |
| ![Dashboard](docs/screenshots/dashboard.png)             | ![Transactions](docs/screenshots/transactions.png) |
| **Budget**                                               | **Analytics**                                      |
| ![Budget](docs/screenshots/budget.png)                   | ![Analytics](docs/screenshots/analytics.png)       |
| **Add transaction**                                      | **Login**                                          |
| ![Add transaction](docs/screenshots/add-transaction.png) | ![Login](docs/screenshots/login.png)               |

**Mobile**

![Mobile screens](docs/screenshots/mobile.png)

## Live demo

**[Open the live demo](https://YOUR-GITHUB-USERNAME.github.io/financeflow-fullstack/)** (hosted on
GitHub Pages). Click **Explore the demo** for a private sandbox with six months of sample data, or log
in as `demo@financeflow.app` / `Demo@12345`.

**How a static site runs a full-stack app.** GitHub Pages only serves static files, so the Pages build
(`npm run build:pages` in `client/`) swaps Axios's HTTP adapter for an in-browser implementation of the
same REST API: [`client/src/demo/demoBackend.js`](client/src/demo/demoBackend.js). It reuses the
server's own Zod schemas, sample-data generator, budget rules and CSV export, so endpoints, status codes,
validation messages and JSON shapes match the real API; only the SQL queries are replaced by array
operations, and data stays in the visitor's browser (localStorage). The normal build contains none of
this code. [`pages.yml`](.github/workflows/pages.yml) redeploys the demo on every push to `main`.

To run the real Express + PostgreSQL backend in production, follow
[Production deployment](#production-deployment) (Render + Neon + Vercel).

## GitHub repository

`https://github.com/YOUR-GITHUB-USERNAME/financeflow-fullstack`

## Security

| Measure                                                                                   | Where                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------ |
| Passwords hashed with bcrypt (cost 12); 72-byte limit enforced                            | `auth.service.js`, `auth.schemas.js` |
| JWT signed with HS256, verified with a pinned algorithm, issuer and audience              | `utils/token.js`                     |
| Every protected request reloads the user, so deleted accounts lose access at once         | `middleware/auth.js`                 |
| Every query is scoped by `userId`; other users' records return 404, not 403               | services                             |
| Zod validation on params, query and body; unknown fields are dropped (no mass assignment) | `middleware/validate.js`             |
| CORS allow-list, Helmet security headers, 10 kb body limit                                | `app.js`                             |
| Rate limits per client IP: failed logins (10 / 15 min), demo sessions, overall API        | `middleware/rateLimit.js`            |
| Same error and similar timing for unknown email and wrong password                        | `auth.service.js`                    |
| Generic 500s; stack traces are only logged on the server                                  | `middleware/errorHandler.js`         |
| Secrets only in environment variables; config validated at start-up                       | `config/env.js`, `.gitignore`        |
| CSV export neutralises spreadsheet formulas                                               | `utils/csv.js`                       |
| Parameterised SQL for the one raw query                                                   | `lib/aggregates.js`                  |

## Future improvements

- Refresh tokens in `httpOnly` cookies with rotation, and "log out of all devices"
- Recurring transactions (rent, subscriptions) and bill reminders
- Custom categories (a `categories` table) and tags
- Multiple accounts and currencies (bank, cash, card)
- Receipt uploads and CSV/bank-statement import
- Monthly email summary
- Dark mode and an installable PWA with offline entry
- End-to-end tests (Playwright) in CI and an OpenAPI (Swagger) spec
- Trigram index for faster search on large histories

---

## Interview guide

A short script for explaining the project, plus the questions interviewers usually ask.

### Problem

People track spending in notes apps or not at all, so they only find out they overspent at the end of
the month. Banking apps show transactions but rarely answer "how much can I still spend?".

### Solution

FinanceFlow records income and expenses in one place, compares spending with a monthly budget in real
time, and turns the data into charts. The key screen answers one question first: how much is left this
month, and am I spending faster than the month is passing?

### Architecture

A React single-page app on Vercel calls a stateless Express REST API on Render, which stores data in
PostgreSQL on Neon through Prisma. The API is layered (routes → validation → controller → service →
database) and organised by feature. Because the API holds no session state, any instance can serve any
request.

### How authentication works

1. **Register:** the API validates the input, hashes the password with bcrypt (a slow, salted hash) and
   stores only the hash.
2. **Login:** it finds the user by email and compares the password with `bcrypt.compare`. On success it
   signs a JWT containing just the user id (`sub`) and an expiry, using a secret only the server knows.
3. **Requests:** the client stores the token and sends it as `Authorization: Bearer <token>`. The
   `requireAuth` middleware verifies the signature and expiry, loads the user and attaches it to
   `req.user`.
4. **Persistent login:** on page load the client calls `GET /auth/me` with the stored token to restore
   the session. Any 401 later (expired token) clears the session and returns the user to the login page.
5. **Logout:** JWTs are stateless, so logout deletes the token on the client; tokens also expire after
   7 days.

### How the database relationships work

One user has many transactions and many budgets (one-to-many). `transactions.user_id` and
`budgets.user_id` are foreign keys to `users.id` with `ON DELETE CASCADE`. Budgets have a unique
constraint on `(user_id, year, month)`, so a month can't have two budgets. Every query includes
`userId`, which is how users only ever see their own data: asking for someone else's transaction id
simply finds nothing and returns 404.

### How API communication works

The frontend has one Axios instance with a base URL from `VITE_API_URL`. A request interceptor adds the
token; a response interceptor handles 401s globally. Each page fetches through a `useApi` hook that
cancels outdated requests with an `AbortController` (so fast filter changes can't show stale results).
Responses are JSON with a consistent error shape, which the UI maps to inline form errors or toasts. In
development, Vite proxies `/api` to the Express server, so no CORS setup is needed locally; in
production the API's CORS allow-list only accepts the Vercel origin.

### Challenges and how I solved them

- **Money and floating point.** `0.1 + 0.2 !== 0.3` in JavaScript. Amounts are stored as
  `DECIMAL(12,2)`, validated to two decimal places, and only converted to numbers for JSON.
- **Dates shifting by a day.** A transaction on "1 Oct" saved as a timestamp can display as "30 Sep" in
  another time zone. Dates are stored as `DATE`, sent as `YYYY-MM-DD` strings and formatted in UTC.
  The "current month" comes from the client, because the server runs in UTC.
- **Monthly charts.** Prisma's `groupBy` can't group by "month of date", so one parameterised raw SQL
  query with `to_char(date, 'YYYY-MM')` and `SUM(...) FILTER (WHERE ...)` computes income and expenses
  per month in a single pass.
- **A public demo that can't be vandalised.** Each visitor gets their own sandbox user with generated
  data; sandbox users are purged after 24 hours via the cascade delete.
- **Free-tier cold starts.** The first request after idle can take ~50 seconds, so the UI explains it
  ("waking up the server") instead of looking broken, and the HTTP timeout is generous.
- **A rounding bug the tests caught.** Spending of 79.99% was rounded to 80% before the warning check,
  triggering a false warning. The status now uses the exact ratio; the rounded value is display-only.

### Important technical decisions

| Decision                                       | Reasoning                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT in the `Authorization` header, not cookies | Frontend and API live on different domains (vercel.app / onrender.com); browsers increasingly block third-party cookies, and header tokens are immune to CSRF. The trade-off (XSS exposure) is reduced by React's escaping, no raw HTML rendering and short token life. Next step: refresh tokens in httpOnly cookies on a shared domain |
| PostgreSQL over MongoDB                        | Financial data is relational and needs constraints, transactions and exact decimal sums                                                                                                                                                                                                                                                  |
| Prisma                                         | Type-safe queries, versioned migrations, readable schema; raw SQL only where it adds value                                                                                                                                                                                                                                               |
| Zod validation                                 | One schema gives runtime validation, coercion and clear messages                                                                                                                                                                                                                                                                         |
| 404 instead of 403 for others' data            | Doesn't reveal that a record exists                                                                                                                                                                                                                                                                                                      |
| Server-side CSV export                         | Exports all filtered rows, not just the current page                                                                                                                                                                                                                                                                                     |
| Dashboard in one endpoint                      | One request with parallel queries (`Promise.all`) instead of six round trips                                                                                                                                                                                                                                                             |
| Tests against real PostgreSQL                  | Catches SQL, constraint and migration problems that mocks hide                                                                                                                                                                                                                                                                           |
| Route-level code splitting                     | Chart code loads only on pages that need it                                                                                                                                                                                                                                                                                              |

### Questions you may be asked

<details>
<summary><b>How do you stop a user from editing someone else's transaction?</b></summary>

The update query is `prisma.transaction.update({ where: { id, userId: req.user.id } })`. If the id
belongs to another user, nothing matches, Prisma throws "record not found", and the API answers 404.
There is a test for read, update, delete, list and export.
</details>

<details>
<summary><b>Why bcrypt and not SHA-256?</b></summary>

SHA-256 is designed to be fast, which helps attackers guess billions of passwords per second. bcrypt is
deliberately slow (cost factor 12) and salts every hash, so identical passwords produce different hashes
and rainbow tables don't work.
</details>

<details>
<summary><b>What happens when the JWT expires?</b></summary>

The API returns 401 with code `TOKEN_EXPIRED`. The Axios interceptor clears the stored token, the auth
provider switches to "logged out", and the protected route redirects to the login page with a message.
</details>

<details>
<summary><b>Where can JWTs be stored, and what are the trade-offs?</b></summary>

`localStorage` (used here) is simple and works across domains but is readable by injected scripts (XSS).
`httpOnly` cookies can't be read by JavaScript but need CSRF protection and same-site deployment. Memory
only is safest but loses the session on reload. A common production setup is a short-lived access token
in memory plus a refresh token in an httpOnly cookie.
</details>

<details>
<summary><b>How would this scale to millions of transactions?</b></summary>

The composite indexes already match the query patterns. Next: cursor-based pagination instead of
`OFFSET`, a trigram index for search, monthly summary tables (or materialised views) for analytics,
caching dashboard results, and read replicas. The stateless API can run as several instances behind a
load balancer.
</details>

<details>
<summary><b>What is CORS and why did you configure it?</b></summary>

Browsers block a page from reading responses from another origin unless that origin allows it. The API
only allows the configured frontend origin (`CLIENT_URL`); any other site's requests are rejected with 403.
</details>

---

Built by **Jatin Gohel** as a full-stack portfolio project. Licensed under the [MIT License](LICENSE).
