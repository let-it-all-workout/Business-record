# Business Record

Inventory, sales, refunds, and profit for a business — products, stock batches, and a staff login. The hosting model matches [Nexora-market](https://github.com/let-it-all-workout/Nexora-market).

## Architecture

There are two code apps. Railway runs one Node process. Postgres is a separate Railway database.

```
Browser  ──https://<one-railway-domain>──►  one Node process
                                              ├── GET /           React build (frontend/dist)
                                              ├── GET /api/...    Express (auth, products, sales)
                                              └── DATABASE_URL    Railway Postgres
```

| Layer | Folder | Role |
|---|---|---|
| UI | `frontend/` | Vite + React. Calls **`/api`** on the same host. |
| API | `backend/` | Express. Auth, inventory, sales, refunds. |
| Data | Railway Postgres | Required. Set `DATABASE_URL`. |

**Locally** you run two processes (Vite `5173` + API `3002`). Vite proxies `/api` to the API, so the browser still sees one origin.

**On Railway** `npm run build` compiles the UI, then `npm start` runs Express with `NODE_ENV=production`. Express serves `frontend/dist` for every non-`/api` GET. The service root is the repository root. There is no Vercel project and no second API service.

`VITE_API_URL` and `ALLOWED_ORIGINS` stay optional. Set them only if you later host the UI on another domain.

```
Business-record/
├── frontend/          # React SPA
├── backend/
│   ├── src/app.js     # HTTP app: /api + static UI
│   ├── src/server.js  # listen on PORT
│   ├── routes/
│   ├── middleware/
│   └── database/      # Postgres
└── railway.json       # build the UI, start the API, health /api/health
```

## Run locally

```bash
npm install
npm run install:all
npm run dev
```

Copy `.env.example` to `.env` and set `DATABASE_URL` to a Postgres URL before you use the API.

- UI: http://localhost:5173
- API: http://localhost:3002 (`/api/health`)

## Deploy on Railway

1. Create one Railway service from this repo. Set the root directory to the repository root, not `backend/`.
2. Add Railway Postgres in the same project and set `DATABASE_URL` on the web service.
3. Set `NODE_ENV=production`. Leave `ALLOWED_ORIGINS` empty.
4. `railway.json` sets build `npm run build`, start `npm start`, and health `/api/health`.

Disconnect any old Vercel project so it does not keep serving a separate UI.
