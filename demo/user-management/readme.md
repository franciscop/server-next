# User management

A fully-fledged example: **GitHub login**, users and sessions
persisted in a **real SQLite database** (`bun:sqlite`), a **validated
management API** (zod), role-based guards, the generated **OpenAPI spec**, and
a **docs UI**.

## Setup

Create a GitHub OAuth app with the callback URL set to
`http://localhost:3000/auth/callback/github`, then:

```bash
echo "GITHUB_ID=your-client-id" >> .env
echo "GITHUB_SECRET=your-client-secret" >> .env
echo "SECRET=a-long-random-string" >> .env
echo "ADMIN_EMAIL=you@example.com" >> .env
npm run dev   # bun with hot reloading; `npm start` for a plain run
```

Sign in at http://localhost:3000/. The account matching `ADMIN_EMAIL` signs in
as the `admin` (via `onLogin`); everyone else is a `member`.

## What to look at

- **`src/db.ts`**: real SQLite tables with columns, exposed as stores through
  polystore's `HAS_EXPIRATION` adapter tier (bare values + TTL, no envelope),
  wrapped once with `kv()` and shared by the server options (`sessions`,
  `auth.users`) and the app's own reads/writes, so logins survive restarts.
  Management queries use plain SQL directly.
- **Roles**: `onLogin` defaults the role (`admin` for `ADMIN_EMAIL`); `requireUser` /
  `requireAdmin` middleware guard the API routes.
- **Validation** (`src/schemas.ts`): query pagination, body patches and response shapes are zod
  schemas; the same schemas drive the spec.
- **Docs**: http://localhost:3000/docs (Scalar over `/openapi.json`).

## The API

| Method | Route | Who |
|--------|-------|-----|
| `GET` | `/api/me` | signed in |
| `GET` | `/api/users?page&search` | admin |
| `POST` | `/api/users` | admin |
| `GET` | `/api/users/:id` | admin |
| `PUT` | `/api/users/:id` | admin, or yourself (name only) |
| `DELETE` | `/api/users/:id` | admin |

The dashboard's add-user form submits to `POST /api/users` as JSON through a
small `client.js` fetch and reloads the table; with JS disabled it still posts
natively (urlencoded) to the same endpoint.
