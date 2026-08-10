# User management

A fully-fledged example in ~150 lines: **GitHub login**, users and sessions
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
npm run dev   # bun with hot reloading; `npm start` for a plain run
```

Sign in at http://localhost:3000/. The **first** user to sign in becomes the
`admin` (via `onLogin`); everyone after is a `member`.

## What to look at

- **`db.js`**: the documented custom-store shape (`get`/`set`) over two SQLite
  tables, handed to `sessions` and `auth.users`, so logins survive restarts.
  Management queries use plain SQL directly.
- **Roles**: `onLogin` stamps the role onto the stored record; `requireUser` /
  `requireAdmin` middleware guard the API routes.
- **Validation**: query pagination, body patches and response shapes are zod
  schemas; the same schemas drive the spec.
- **Docs**: http://localhost:3000/docs (Scalar over `/openapi.json`).

## The API

| Method | Route | Who |
|--------|-------|-----|
| `GET` | `/api/me` | signed in |
| `GET` | `/api/users?page&search` | admin |
| `GET` | `/api/users/:id` | admin |
| `PUT` | `/api/users/:id` | admin, or yourself (name only) |
| `DELETE` | `/api/users/:id` | admin |
