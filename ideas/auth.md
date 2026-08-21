# Third-party auth: accept Better Auth (and friends) as `auth`

Proposal: instead of shipping our own auth system, let `auth` take a
third-party one, starting with [Better Auth](https://better-auth.com):

```js
import { betterAuth } from 'better-auth';

const auth = betterAuth({ database: db, emailAndPassword: { enabled: true } });

export default server({ auth }).get('/me', (ctx) => ctx.user || 401);
```

Status: an **idea**. Nothing is decided and no framework code implements any
of it. The `mount` mode was prototyped to see whether it works, measured, and
then reverted; what it taught is recorded below. The two demos
(`demo/auth-better-auth`, `demo/auth-jwks`) run today against the framework as
it actually is, with the integration written by hand.

## Why consider it

Our auth is small and covers the common path, but the gaps are the expensive
kind to close: account linking (one person with GitHub *and* Google is two
records today), 2FA, passkeys, magic
links, organizations and teams, per-route rate limiting, session revocation
UIs, and the long tail of provider quirks. Each is weeks of work plus an
ongoing security surface, and each is something Better Auth already ships.

The counter-pressure is that auth is also the framework's best demo: a
one-liner (`auth: 'cookie:github'`) that needs no database, no schema and no
migration, and runs on Workers with a KV store. That is a real product
feature, not just convenience, and it is the thing a third-party library is
least likely to preserve.

## The layers

Auth is not one thing, and the candidates own different amounts of it. This is
the table that makes the rest of the document make sense:

| Layer | Ours | antarctic | Better Auth | Clerk |
|-------|------|-----------|-------------|-------|
| 1. Provider handshake (OAuth dance, profile) | yes, 6 providers | yes, 65 | yes | yes (remote) |
| 2. Identity store (users, linking, passwords) | yes, your KV | no, "your responsibility" | yes, your SQL | yes, **their database** |
| 3. Credential (issue and verify sessions) | yes, cookie/token/jwt | no | yes | yes, **their tokens** |
| 4. Sign-in UI | no, you build it | no | no, or their SDK | yes, **prebuilt components** |
| Where it runs | your server | your server | your server | **their servers** |

So they are not competing implementations of one interface, they are three
different amounts of your app given away. [antarctic](https://github.com/franciscop/antarctic)
owns layer 1 only. Better Auth owns 1 to 3, self-hosted. Clerk owns 1 to 4 and
holds the data.

## Three modes, named by relationship

Since they sit at different layers, one uniform `auth` shape would be a lie.
Name the relationship instead, with three mutually exclusive forms:

```js
// Ours: we own every layer. `providers` is layer 1, and swappable.
auth: { strategy: 'cookie', providers: [GitHub], users, sessions }

// Mount: they own layers 1-3 and run here, so their routes get mounted.
auth: { mount: betterAuth({ database, socialProviders }) }

// Verify: they own everything and run elsewhere, so we only check credentials.
auth: { verify: clerkClient }
auth: { verify: 'https://accounts.google.com' }   // any OIDC issuer
```

Reading any of those tells you what you get without knowing the vendor:
`mount` means their code executes on your server and owns URLs; `verify` means
nothing of theirs runs and your server holds no session state. antarctic is not
a mode at all, it is a value for `providers`, which is exactly right since it
swaps an internal layer rather than the system.

The alternative, duck-typing a bare `auth: betterAuth(...)` by sniffing for
`.handler`, is terser but hides the distinction and gives three unrelated
behaviours one key with no cue which you got.

What each mode costs the framework:

- `providers`: swap the provider files, keep everything else. Small.
- `mount`: rebuild a `Request` from ctx, forward raw bytes, wildcard routes,
  resolve ctx.user from their session reader. ~50 lines (prototyped, see below).
- `verify`: a middleware calling their verifier, plus the same resolution for
  WebSocket handshakes. ~15 lines.

Under `mount` and `verify`, `ctx.user` is **their** shape, and none of our
callbacks or stores apply. So `auth` stops being one feature with options and
becomes a slot with three incompatible fillers, which the docs should say
plainly rather than pretending it is one thing.

## The four options

**A. Replace ours entirely.** `auth` accepts only third-party objects. Deletes
`src/auth/` (providers, strategies, callbacks, the login routes) and the whole
users/sessions store story with it. Smallest maintenance surface, biggest loss
of the zero-config demo, and a hard break for every current user.

**B. Keep ours, accept third parties too** (the hybrid). `auth` stays as it is
for the string and object forms, and additionally accepts anything matching the
adapter contract. Ours remains the zero-dependency default; a real app that
outgrows it swaps in Better Auth without leaving the framework. Costs: two
code paths to document and keep coherent, and a `ctx.user` whose shape now
depends on the provider.

**C. Remove ours, third-party only, but ship a first-party adapter.** Our auth
becomes `@server/auth` (a separate package, possibly a plugin per
[plugins](./plugins.md)), so the framework core carries none of it while the
one-liner still exists for those who install it. This is the option the
plugins work makes newly available, and it is the one that keeps both
properties at the cost of a package split.

**D. Keep our auth, swap its engine.** Not a third-party auth *system* at all:
replace only layer 1 (our provider files) with generic OIDC plus
[antarctic](https://github.com/franciscop/antarctic) for the non-OIDC
stragglers. Strategies, sessions, `users`, `ctx.user`, the callbacks and the
one-line demo are all untouched; `auth: 'cookie:github'` keeps working; no
database appears; provider count goes from 6 to ~65 plus every OIDC issuer.

D addresses the "our auth cannot keep up on providers" half of why third-party
auth looked attractive, and leaves the other half (2FA, passkeys, orgs)
unaddressed. It is also the only option that is strictly additive, so it
composes with B: swap the engine *and* accept `mount`/`verify` for apps that
need the features.

D's open question is `onProfile`. Today it receives the **raw** provider
payload, which is how apps read `login`, `company` or anything else GitHub
returns. antarctic normalizes to `{ id, name, email, image }` inside
`getUser()` and the raw profile never surfaces; generic OIDC has the same
issue (the id_token's claims are the profile). Either the hook's meaning
changes to "shape the normalized user" (breaking, and less powerful), or the
provider layer grows a way to return raw alongside normalized. Since antarctic
is our fork, that is a change we control.

## OIDC and JWKS: one implementation, many providers

The single highest-leverage finding, and it corrects an assumption made
earlier in this document.

**JWKS is universal, `jwks.json` is not.** The format (a JSON Web Key Set,
RFC 7517) is standard everywhere; the path is arbitrary. Checked live:

| Provider | Actual JWKS URL |
|----------|-----------------|
| Google | `/oauth2/v3/certs` |
| Microsoft | `/common/discovery/v2.0/keys` |
| Apple | `/auth/keys` |
| Slack | `/openid/connect/keys` |
| GitLab | `/oauth/discovery/keys` |
| Twitch | `/oauth2/keys` |
| LinkedIn | `/oauth/openid/jwks` |
| Salesforce | `/id/keys` |
| PayPal | `/v1/oauth2/certs` |
| Yahoo | `/openid/v1/certs` |
| Zitadel | `/oauth/v2/keys` |
| Discord | `/api/oauth2/keys` |
| Spotify | `/oidc/certs/v1` |
| GitHub (Actions only) | `/.well-known/jwks` |

None of them serves `/.well-known/jwks.json`; requesting it directly returns
404 on Google and Slack, 403 on Apple. Auth0, Supabase and Cognito do use that
path, which is where the assumption came from, and they are tenant-specific.

**What is universal is the discovery document** at
`/.well-known/openid-configuration`, which every one of them serves and which
contains `jwks_uri`, `issuer` and the supported algorithms. So the option
should take an **issuer URL**, never a JWKS URL:

```js
auth: { verify: 'https://accounts.google.com' }   // discovery finds the rest
```

### It lands in three places at once

The same verification code serves three different needs, which is what makes
it worth building centrally:

1. **Generic OIDC login.** For an OIDC provider the authorization code flow
   returns an `id_token`: a JWT whose claims *are* the profile (`sub`, `name`,
   `email`, `picture`), standardized. Discovery plus code exchange plus JWKS
   verification is **login for any OIDC provider with one implementation and no
   per-provider profile code**. Confirmed to work generically for Google,
   Microsoft, Apple, Discord, Spotify, Facebook, Twitch, LinkedIn, Salesforce,
   Slack, GitLab, Yahoo, PayPal, plus every tenant IdP (Auth0, Okta, Cognito,
   Keycloak, Zitadel, Kinde).
2. **Hosted verification.** The `verify` mode above: a SPA signs in with the
   vendor's SDK and sends the token; we check it.
3. **Machine to machine.** Service tokens, GitHub Actions OIDC, cloud workload
   identity. Same code, no login flow at all.

### The exceptions keep the provider layer alive

**GitHub, Reddit and Notion have no discovery document** (GitHub's OIDC covers
Actions only; its user login is plain OAuth 2.0 with a bespoke profile
endpoint). So generic OIDC cannot serve the single most likely provider for
this framework's audience, which is precisely what antarctic is for: the
plain-OAuth2 stragglers and the 65-provider long tail.

That divides the work cleanly:

- **Generic OIDC** (discovery + JWKS): most providers, one implementation.
- **antarctic**: GitHub, Reddit, Notion and the long tail, where someone has to
  know each API's profile endpoint.
- **`verify`**: tokens minted elsewhere, same machinery, no login flow.

### The security catch

Getting many providers "for free" means many issuers to pin correctly.
Verifying only the signature is a real hole, demonstrated with jose:

```
signature-only  -> ACCEPTED attacker@x.com | aud: some-other-app
aud pinned      -> rejected: ERR_JWT_CLAIM_VALIDATION_FAILED
```

A token signed by the right issuer **but minted for a different application**
authenticates against yours. On a shared issuer (Google, or one Auth0 tenant
serving several apps) that is cross-app impersonation. The fix is
`jwtVerify(token, jwks, { issuer, audience })`, and both values come free from
the discovery document.

This is an argument for the framework owning it rather than shipping a
five-line `.use()` recipe: the five-line version is what people write, and it
is insecure by omission.

## The bloat question

Unmeasured, but the shape of the problem:

- **A database requirement.** Better Auth is built around a SQL schema and an
  adapter (Kysely/Drizzle/Prisma). Our auth needs only a KV `get`/`set`. For an
  app that wanted "sign in with GitHub" and nothing else, that is a database,
  a schema and a migration where there was none.
- **Dependency weight.** A full auth library brings its own validation, crypto
  and query layers. We currently ship two small dependencies total; this could
  plausibly multiply the install size of a minimal app.
- **Cold starts and edge.** Serverless and Workers care about both bundle size
  and whether the DB driver is edge-compatible. Our KV-based auth runs on
  Workers today; a SQL-backed one may not, or may need a specific driver.
- **What we would delete.** Removing `src/auth/` takes real weight *out* of the
  core bundle, so the net for a Better Auth user is smaller than the gross,
  and the net for a no-auth user is a straight win.
- **And polystore goes with it.** Since the session bag was removed, every
  remaining call to `toStore`/`toStoreExpiring` is for `auth.users` or
  `auth.sessions` (`parseAuthOptions` and the dev defaults in `config.ts`).
  Drop our auth and the dependency has no internal caller left, taking the
  framework from two runtime dependencies to one (`bucket`, for
  `uploads`/`public`). That is a genuine counterweight to the bloat: we are not
  only adding someone else's tree, we are deleting one of our own.

Worth stating plainly: for an app that already runs Postgres and wants real
auth features, the bloat argument is weak. For the "one file, one line, no
database" app the framework currently courts, it is decisive. That tension is
the actual decision.

## Consequences to design for

- **`ctx.user` stops being ours.** Its shape becomes the provider's. Either we
  normalize (a mapping function per adapter, losing provider-specific fields)
  or we expose it raw and `server<{ user: User }>()` becomes the only typing
  story. The latter is more honest and less work.
- **The auth callbacks disappear.** `onProfile`, `onLogin`, `onUser`,
  `onToken`, `onLogout` are our lifecycle; third parties have their own hooks
  and would not route through ours.
- **`auth.users` and `auth.sessions` disappear too**, along with the store
  contract they define, and with them the whole question of how our KV
  interface meets a relational database: whichever engine owns auth owns its
  own storage, so the tension stops being ours to resolve.
- **The socket handshake** (`socketUser`) needs the same "resolve a user from
  headers and cookies" capability, which the contract above provides, as long
  as the adapter can answer without a full `Request`.
- **The `kv` export becomes homeless.** It is re-exported from polystore for
  users to build stores with. With no framework caller left it would either be
  dropped (breaking, and it is genuinely useful) or kept as a pure re-export of
  a dependency the framework itself never touches, which is hard to justify in
  the install.
- **The store contract disappears from the docs.** "Your own store" (the
  documented `get`/`set` shape), the polystore adapter tiers, and the
  user-management demo's SQLite adapter all exist to back auth. If auth is
  third-party, its library owns persistence and none of that is ours to
  document.
- **The "batteries included" claim changes.** The readme and Getting Started
  both say the key-value store ships with the framework so logins work out of
  the box. Under a third-party system, logins need that system, its database
  and its schema.
- **Docs, demos and tutorials.** The auth guide, the GitHub-login tutorial and
  the user-management demo are all built on our system.

## Which systems to test against

A contract that only fits Better Auth is not worth building, so the candidates
matter. Rather than one adapter per product, most of the market reduces to
four shapes, and covering a shape covers everything in it:

| Shape | How it integrates | Examples |
|-------|-------------------|----------|
| **Mount a handler** | it owns routes under a prefix, plus a session reader | Better Auth, OpenAuth, Ory Hydra |
| **Verify a JWT** | no routes; validate a token against a JWKS endpoint | Auth0, Supabase, Cognito, Keycloak, Zitadel, Logto, Firebase, Okta, Entra |
| **Call the vendor's SDK** | no routes; their SDK verifies (proprietary token or network call) | Clerk, WorkOS, Stytch, Kinde, PropelAuth, Descope |
| **OAuth client only** | no sessions at all; it does the provider handshake, we keep the session | Arctic, oslo |

The JWT row is the highest-leverage one: implementing "verify against a JWKS
URL" once serves every enterprise IdP in that list without a per-vendor
adapter, since it is a standard rather than a product.

### The test set

Six candidates, one per shape plus the obvious popular ones:

- **Better Auth**, the primary target and the reason for the idea.
- **Clerk**, the most popular hosted option and the best stress test for the
  SDK shape, since it verifies without a token we can parse ourselves.
- **Supabase Auth**, a huge install base and a plain JWT/JWKS story, so it
  doubles as the proof that the standards-based row works.
- **Auth0**, the canonical enterprise IdP, to confirm the JWKS path is not
  Supabase-shaped by accident.
- **OpenAuth**, self-hosted and Workers-oriented, which tests the edge story
  a SQL-backed library may fail.
- **Arctic**, the interesting one: an OAuth 2.0 client with no sessions and no
  database. Pairing it with our existing store layer is option B in miniature,
  and might buy most of the provider coverage for a fraction of the change.

Filled in empirically (2026-08). Legend: **tested** = ran end to end here;
*signals* = measured install + inspected exports/docs, not executed.

| | Better Auth | Clerk | Supabase | Auth0 | OpenAuth | Arctic |
|---|---|---|---|---|---|---|
| Shape | mount | SDK | JWT | JWT | mount | OAuth only |
| Works without a database | dev only (memory adapter) | yes (hosted) | yes (hosted) | yes (hosted) | KV storage, no SQL | yes (no storage at all) |
| Runs on Workers | yes, with an edge DB adapter (3 node: imports, conditional) | yes (`worker`/`edge-light` exports, 0 node:) | yes (jose path) | yes (jose path) | built for it (docs), 4 node: in storage adapters | yes (0 node:) |
| User from bare headers (sockets) | **tested**: `getSession({ headers })` | `verifyToken(string)`, so yes | **tested** (header string) | **tested** (header string) | `client.verify(token)`, so yes | ours, so yes |
| Revoke one session | **tested**: `listSessions`/API | vendor API | vendor API; JWTs live until expiry | vendor API; JWTs live until expiry | refresh only; tokens live until expiry | ours, so yes |
| List a user's sessions | **tested**: `listSessions` | vendor API | limited | limited | no | ours |
| Account linking | yes (built-in) | yes (vendor) | yes (vendor) | yes (vendor) | yours to build | yours to build |
| Installed size | **30MB** | 15MB | 8.9MB SDK, or **456KB** (jose) | 456KB (jose) | 6.0MB | 1.1MB |
| Direct deps | 14 (kysely, zod, jose, nanostores, @noble, @opentelemetry...) | 6 | 2, or 1 (jose) | 1 (jose) | 4 (incl. hono + arctic) | 1 (@oslojs) |
| Import cost (fresh process) | 87ms | 15ms | 8ms (jose) | 8ms (jose) | 7ms (client) | 9ms |
| Fits the contract | **tested: yes** (`server({ auth })` works) | n/a: plain middleware, no mount | n/a: plain middleware | n/a: plain middleware | probably (issuer has `.fetch`), untested | no: a provider layer, not an auth system |

Reference points: our whole auth is **27KB minified**; the framework's entire
dependency tree (bucket + polystore) is **2.6MB**; importing the whole
framework takes 33ms. So Better Auth alone is ~11x our full dependency tree
and its import costs ~2.6x importing all of server-next.

What actually ran (all committed as demos/tests):

- **Better Auth end to end** (`demo/auth-better-auth`): sign-up, sign-in,
  `ctx.user`, guests, `listSessions`, bare-headers resolution. Works as
  `server({ auth })` via the implemented contract.
- **The whole JWT row** (`demo/auth-jwks`): one jose middleware, tested against
  a local issuer (own keys, own JWKS endpoint, forged-token rejection). This is
  the Supabase/Auth0/Cognito/Keycloak story and it needs no framework feature
  at all, just `.use()`.
- **The contract itself** (`src/auth/external.test.ts`): a hand-rolled fake
  with the ExternalAuth shape, so the framework tests carry no dependency.

The contract finding: the two-capability theory held, but with a correction.
Only the **mount** shape needs a framework feature (rebuilding a `Request`
from ctx, raw body, wildcard routes). The **verifier** shapes (Clerk, the JWT
row) are a five-line `.use()` middleware and need nothing from the framework,
so `ExternalAuth` requires `handler` and verifiers simply do not use it.

Explicitly *not* targets: **Auth.js/`@auth/core`** (deprecated in favour of
Better Auth) and **Lucia** (no longer a library, now a guide to writing your
own). Which is itself a finding worth writing down: two of the three obvious
choices from a year ago are gone, so depending on any single third party here
carries real churn risk, and the adapter contract is what limits the blast
radius when one of them disappears.

## What the prototype taught

The `mount` mode was built end to end against the real Better Auth and then
reverted. Worth keeping:

- **It works, and it is small.** Detecting the shape, mounting wildcard routes
  under a base path, rebuilding a `Request` from ctx with the raw body, and
  resolving `ctx.user` from `getSession` came to roughly 50 lines plus types.
  Better Auth signed up, signed in, resolved `ctx.user`, listed sessions and
  answered from bare headers, with `server({ auth })` and nothing else.
- **`getSession({ headers })` covers WebSockets.** It needs only headers, which
  is exactly what an upgrade request has, so socket handshakes authenticate
  through the same call with no extra work. That was the integration risk most
  likely to fail, and it did not.
- **The type cost is the real cost.** `Settings["auth"]` becomes a union, and
  every internal reader (`getUser`, `logout`, `finishLogin`, `findSessionId`,
  all six provider files) has to narrow. That is a dozen files touched for a
  feature none of them participate in, and it is the strongest argument for
  keeping third-party auth in a *separate* slot (or a plugin) rather than
  overloading `auth`.
- **Verifiers need no framework feature at all.** Clerk and the whole JWT row
  are a `.use()` middleware. Only the mount shape needs anything, which is why
  the three modes above are named separately.

## What to measure about us

The per-candidate answers go in [the matrix above](#the-test-set). Two numbers
are about this framework rather than any candidate, and both change the trade:

- How much of `index.js` is currently `src/auth/`, i.e. what removal buys back.
- Cold-start impact for a trivial serverless app, with and without.

## Open questions

- Which option (A, B, C)? C looks most compatible with the plugins direction,
  but it is also the one that needs plugins to land first.
- Does the adapter contract live in core, or is each adapter a plugin?
- If third-party auth mounts its own routes, do they appear in the OpenAPI
  spec (ours are tagged `auth` today), and can they be hidden?
- Do we normalize `ctx.user` across providers, or expose each one raw?
- What happens to the existing `strategy: cookie | token | jwt` model, which
  has no direct equivalent in most libraries?
- Is there a migration path for apps on our auth, or is this a 1.0 break?
- If polystore goes, does the `kv` export go with it, move to its own package,
  or stay as a re-export the framework never calls?
- Does the `providers` swap (option D) keep `onProfile`'s raw payload, or does
  the hook change meaning?
- Is generic OIDC login built in, or does antarctic cover OIDC providers too
  (it has an `oidc` module) and the framework only ever talks to antarctic?
- Does `verify` take an issuer URL and force an `audience`, given that omitting
  the audience check is the documented footgun?
