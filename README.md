# SENTRIQ Backend

Trusted API server for the SENTRIQ platform (QHSE/HSE enterprise ERP). NestJS + TypeScript, deployed to Vercel for staging.

## Architecture

```
UI (sentriq_ui)  ──Bearer JWT──▶  sentriq_backend  ──user JWT──▶  Supabase PostgREST (recovera)
                                      │                              api.v_memberships, api.authorize,
                                      ▼                              api.list_my_entitlements, …
                              Supabase Auth GET /auth/v1/user
                              (token verification)
```

The backend is a **thin, audited layer over the database**, not a second authorization system:

- **Authentication**: the caller's Supabase access token is verified against Supabase Auth (`GET /auth/v1/user`) using the public anon key. This works for legacy and signing-key projects alike and keeps verification at the identity provider.
- **Authorization stays in the database**: every PostgREST call forwards the *caller's own token*, so `auth.uid()`, RLS policies, and the audited `api.*` RPC guards decide access. The backend never uses the service-role key, never bypasses RLS, and never trusts a browser-supplied tenant or actor id.
- **Schema profile**: PostgREST requests select the `api` schema via `Accept-Profile` / `Content-Profile` headers. The `private` schema is never touched.

## Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /health` | none | Liveness probe. |
| `GET /v1/me/capabilities?tenantId=<uuid>` | Bearer | Caller profile for one tenant: identity, membership (management level, status, site access, functional roles from `api.v_memberships`), and module/feature entitlements for Company Superadmins (`api.list_my_entitlements`). `membership: null` when the caller is not a member. The UI uses this to build menus; the database still enforces everything. |
| `POST /v1/authorize` | Bearer | Passthrough to the audited `api.authorize` RPC: `{tenantId, permissionKey, action, siteId?, orgUnitId?, taskKind?, taskId?}` → `{allowed: boolean}`. For per-action UI checks; the decision is computed by the database at call time. |

Errors: `401` missing/invalid token, `400` invalid input, `502 database_error:<code>` when PostgREST rejects the call (e.g. `PGRST106` while the hosted project does not expose the `api` schema yet).

## Configuration

All configuration is environment variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` of the target project (staging: recovera). |
| `SUPABASE_ANON_KEY` | Public anon/publishable key. The service-role key must **never** be configured here. |
| `PORT` | Listen port for local development (default 3000). Not used on Vercel. |

## Local development

```bash
npm ci
cp .env.example .env   # fill in the recovera values
npm run build && npm start
npm run lint
npm test               # unit tests (Supabase mocked)
npm run test:e2e       # HTTP-level tests (Supabase mocked)
```

## Deployment

- **Staging**: Vercel project `sentriq-backend-staging`. The only Vercel-specific file is `api/index.ts` (serverless adapter) plus `vercel.json`; all configuration is environment variables.

## Prerequisites on the Supabase project

The hosted project must expose the `api` schema through PostgREST (Settings → API → exposed schemas), matching `supabase/config.toml` in the database repo (`api`, `core`, `iam`, `hse`, `audit`; `private` stays unexposed). Until then, `/v1/*` endpoints return `502 database_error:PGRST106`.

## CI

GitHub Actions (`.github/workflows/ci.yml`): lint, unit tests, e2e tests, and a production build on every push and PR.
