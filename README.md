# Business Record

Inventory, sales, refunds, and profit for one shop. Products, stock batches, goods inventories, and a staff login live in the same app.

## Architecture

The repository has two apps. Production runs **one Node process**. Postgres is a separate database.

```
Browser  ──https://<your-host>──►  one Node process
                                    ├── GET /           React build (frontend/dist)
                                    ├── GET /api/...    Express (auth, products, sales)
                                    └── DATABASE_URL    Postgres
```

| Layer | Folder | Role |
|---|---|---|
| UI | `frontend/` | Vite + React. Calls `/api` on the same host. |
| API | `backend/` | Express. Auth, inventory, sales, refunds. |
| Data | Postgres | Required. Set `DATABASE_URL`. There is no SQLite fallback. |

Locally you run two processes: Vite on port `5173` and the API on port `3002`. Vite proxies `/api` to the API, so the browser still sees one origin.

In production, `npm run build` compiles the UI and `npm start` runs Express with `NODE_ENV=production`. Express serves `frontend/dist` for every non-`/api` GET. The service root is the repository root, not `backend/`.

On first start the API creates the tables in `backend/database/schema-postgres.sql` (accounts, businesses, products, stock, sales, refunds, and goods). You do not create a separate database for sales or inventory.

`VITE_API_URL` and `ALLOWED_ORIGINS` stay empty when the site and the API share one address. Set them only if the UI is later hosted on another domain.

## Accounts

The public signup form creates a new business and makes that person its **admin**. Another signup does not join that business. It creates a different shop.

An admin can add people inside the shop. Those accounts default to **staff**. Roles are `admin`, `manager`, `staff`, and `viewer`. There is no super admin that can see every business.

## Theme

The moon icon in the header, and on the sign-in page, switches light and dark. The choice is saved in the browser.

## Run locally

```bash
npm install
npm run install:all
cp .env.example .env
npm run dev
```

Set `DATABASE_URL` in `.env` to a Postgres URL before you use the API.

- UI: http://localhost:5173
- API: http://localhost:3002 (`/api/health`)

## Deploy

The current host is **Render** for the web service and **Neon** for Postgres. Neon’s free plan keeps the data. Render’s free Postgres expires after 30 days, so do not create a Render database.

1. Create a Neon project and copy the connection string (`postgresql://...`).
2. If the string contains `channel_binding=require`, delete that part and keep `sslmode=require`.
3. Create one Render **web service** from this repo. Root directory is the repository root.
4. Build command: `npm run build`
5. Start command: `npm start`
6. Health check path: `/api/health`
7. On the web service, open **Environment** (not Settings, and not an environment group) and add only `DATABASE_URL`.
8. Save with **Save and deploy**.

Do not set `NODE_ENV` in the Render dashboard. `npm start` sets it. Setting it earlier makes the UI build skip Vite.

`/api/health` shows that the site is up. It does not prove Neon accepted the password. After deploy, the Render logs should include `Connected to PostgreSQL database` and `PostgreSQL schema initialized`.

The same build and start commands work on any host that runs Node and sets `PORT` and `DATABASE_URL`. `railway.json` is the optional Railway config for that same one-process layout.
