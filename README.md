# xAPIvate

Web app for connecting enterprise SaaS applications and Learning Record Stores (LRS) into a centralized view, with xAPI statement tracking, middleware automations, and real-time visualizations.

## Local development

### Prereqs

- Node.js (recommended: the current LTS)
- Postgres + Redis:
  - Preferred: Docker Desktop (if available)
  - No-admin option: `npx prisma dev` for Postgres (Redis still required for jobs)

### Start dependencies (Postgres + Redis)

```bash
docker compose up -d
```

This uses the local `docker-compose.yml`:
- Postgres: `localhost:5432` (db `context_layer`, user `context`, password `context`)
- Redis: `localhost:6379`

If you don't have Docker/admin rights, you can start Postgres with:

```bash
npx prisma dev
```

Then update `DATABASE_URL` in `.env` to the connection string it prints.

### Configure environment

Copy `.env.example` to `.env` and update values if needed.

### Run the dev server

```bash
npm install
npm run dev:bootstrap
```

Then open `http://localhost:3000`.

## Scripts

- `npm run dev`: run Next.js in dev mode
- `npm run dev:bootstrap`: run deterministic DB bootstrap, then start Next.js
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: lint
- `npm run worker`: run background job worker (BullMQ)
- `npm run preflight`: validate required env vars + database connectivity
- `npm run preflight:worker`: validate env vars + database + Redis connectivity
- `npm run db:bootstrap`: create DB if missing and apply tracked SQL migrations
- `npm run db:migrate:safe`: deterministic migration/bootstrap helper for local DBs

## Migration hardening (local)

For a deterministic local setup (including first-time startup), use:

```bash
npm run db:bootstrap
```

This command:
- ensures the target database exists
- applies versioned SQL migrations in order
- tracks applied migrations in `_cl_migrations`

`db:migrate:safe` remains available as a Prisma CLI fallback, but `db:bootstrap` is the recommended path on Windows environments where Prisma schema engine errors can occur.

## Startup preflight

Before app/worker startup, preflight checks now validate:
- required env vars (`DATABASE_URL`, `APP_ENCRYPTION_KEY`, `SESSION_SECRET`)
- database reachability (`SELECT 1`)
- Redis reachability for worker startup (`PING`)

This gives immediate, actionable errors when dependencies are down.

## Test server / Docker (production-style)

Build the app image:

```bash
docker build -t context-layer .
```

Run **Postgres + Redis + app** together (good for a shared test host):

```bash
# In .env (same directory), set at least:
# DATABASE_URL=postgresql://context:context@db:5432/context_layer
# REDIS_URL=redis://redis:6379
# APP_ENCRYPTION_KEY=<openssl rand -hex 32>
# SESSION_SECRET=<openssl rand -base64 32>
# SESSION_COOKIE_SECURE=false   # required for plain http:// unless you terminate TLS

docker compose -f docker-compose.stack.yml --env-file .env up -d --build
docker compose -f docker-compose.stack.yml --env-file .env run --rm app node scripts/db-bootstrap.mjs
```

Then open `http://<host>:3000`. Sign up creates the first tenant; login needs **tenant slug + email + password**.

### Login over HTTP (test servers)

With `NODE_ENV=production`, session cookies default to **`Secure`**, so browsers will **not** store them on **http://** (only **https://**). That looks like “login succeeds then immediately kicks back to `/login`.” Set `SESSION_COOKIE_SECURE=false` when you are not using HTTPS. Remove or set to `true` once TLS is in front of the app.
