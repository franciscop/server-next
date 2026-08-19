# Auth storage: KV contract vs relational tables

How the framework's minimal store contract meets apps that want real database
tables.

## The tension

The framework's contract is key-value: `get`/`set`/`del` on opaque values
keyed by an id (plus `prefix`/`expires` at boot). It never looks inside the
value, which is what makes "pass a `Map`, a Redis client, or 20 lines of your
own" work.

Apps often want tables instead: columns, indexes, foreign keys, joins. Not for
aesthetics, but for questions the KV interface cannot express ("every login
for this user", "list my devices") and guarantees it cannot give (deleting a
user cascades their logins).

## The three reconciliations

1. **Blob**: the whole record serialized into one column. KV-in-a-table
   (Django's `django_session`, Rails' activerecord-session-store,
   connect-pg-simple). Persists fine, queries nothing.
2. **Hybrid**: blob plus a few promoted indexed columns. Laravel's sessions
   table is `id, user_id, ip_address, user_agent, payload, last_activity`:
   arbitrary data still allowed, but the fields worth querying become real
   columns.
3. **Relational**: no blob, fixed columns and a foreign key (Auth.js, Lucia,
   better-auth). Only possible when the record has a fixed schema.

better-auth adds a fourth wrinkle: relational tables as truth plus an optional
KV (`secondaryStorage`) as the hot cache. Truth is relational, speed is KV,
and the interface between them is three methods.

## Where server-next sits

The two auth stores sit on opposite sides of the question:

- `auth.sessions` is fixed-schema: `{ user, provider, created }`, written only
  by the framework. A relational table for it is trivially correct, so the
  blob and hybrid patterns have nothing to offer here.
- `auth.users` is app-defined: `onLogin` returns whatever record the app wants
  (our demo stores `role`, `picture`, `provider`), so this is where the
  blob/hybrid/relational choice actually lands, and the framework offers no
  opinion.

The per-request path is always two reads (`sessions.get(id)` then
`users.get(record.user)`), even on a backend that could answer both in one
join, because nothing can ask it to.

Live example in the repo: `demo/user-management/src/db.ts` uses polystore's
`HAS_EXPIRATION` adapter tier, which hands the adapter bare records plus a TTL
instead of the `{ expires, value }` envelope, so fields map straight onto real
columns, with `Object.assign` extensions holding the plain-SQL queries.

## Implementation alternatives

Work today, entirely app-side:

- **Custom adapter per table**: hand-written `get`/`set`/`del` mapping to SQL.
  Full control, boilerplate per table. What the demo does.
- **jsonb plus expression indexes** (Postgres): keep the blob, index
  `((data->>'user'))`. Relational queries with one representation, no promoted
  columns, no drift. A generic jsonb adapter serves any record shape.
- **Generated columns**: let the database maintain the promoted column from
  the blob, which is the hybrid pattern without the duplication risk and with
  zero app code:

  ```sql
  user_id TEXT GENERATED ALWAYS AS (json_extract(data, '$.user')) STORED,
  CREATE INDEX ON sessions(user_id);
  ```

- **ORM-backed adapter**: a Drizzle/Prisma model plus a ~10-line `get`/`set`
  shim, so migrations and types come from the app's existing tooling.
- **Cache in front**: KV (Redis) for hot reads with SQL as truth, composed
  inside a single read-through adapter.

Would need framework work:

- **Optional store methods, duck-typed**, in the style `bucket` already uses
  for `info()`/`slice()`: the framework calls `store.getWithUser?.()`,
  `store.findByUser?.()`, `store.prune?.()` when present and falls back
  otherwise. Relational backends get the joined read and revoke-by-user
  without changing the base contract, and `Map` still works.
- **A second store tier with query semantics**: more capable, but drifts
  toward shipping an ORM-shaped abstraction.
- **Named-method adapters instead of a KV** (the Auth.js model): the framework
  asks for `getSessionAndUser`, `createSession`, `deleteUserSessions`.
  Explicit and optimal per backend, but a much larger interface, and "pass a
  Map" stops being trivially possible.

The dimension underneath: keep a **minimal contract** and let adapters be
clever underneath (generated columns, jsonb, read-through caches are all
app-side), or grow a **richer contract** so the framework can exploit backend
capabilities itself. The first preserves the "pass a Map" promise; the second
is what the auth-first libraries chose.

## Related gap: account linking

Users are keyed by provider identity, so one person with GitHub and Google
logins is two records. The auth-first libraries model this with an `accounts`
table (one person, several linked providers) and center their schema on it.
An app can fake it inside a custom `users` adapter (resolving by email), but
the framework does not model linking, and `onLogin` only ever sees one
provider's profile. This is the largest structural distance to Auth.js-style
parity, and unlike the items above it is a project, not a change.

## Open questions

- Is the two-read path worth a hook (`getWithUser`), or is it fine until
  someone measures it?
- Should any of the app-side recipes (jsonb adapter, generated columns, ORM
  shim) ship as documented recipes, or stay folklore?
- If optional duck-typed methods land, which ones earn their place:
  joined read, revoke-by-user, prune, list-by-user?
- Does account linking ever become framework territory, or stay an app
  concern that a custom `users` adapter can approximate?
