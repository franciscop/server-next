# Remove browser sessions

Proposal: remove `ctx.session` (the per-device data bag) from the public API and
keep sessions only as internal login records for the auth strategies that need
them. Users would interact with `ctx.user` and nothing else.

## The tension

A "session" conflates two different concepts that happen to share a name:

- **Device session**: per-browser scratch storage (guest carts, wizards, flash
  messages). Exists before login, arguably should survive logout, wants to be
  long-lived and stable.
- **Login proof**: "this device is signed in as user X until Y". Starts at
  login, dies at logout, wants rotation (fixation defense), expiry, revocation.

The PHP/Django/Rails lineage grew the first and tucked auth inside it. The
auth-first libraries (Auth.js, Lucia, better-auth) only ever built the second;
their `sessions` table is really a `logins` table. The codebase already knows
they are separable: `jwt` has login proof but `ctx.session` throws, and a
`token` guest has neither. The conflated case is only the cookie strategy.

There is a second fault line even among session-wanters, where the bag lives:
client-carried (whole session in a signed/encrypted cookie: Rails default,
Flask, iron-session; JWT claims are the api analog) versus server-stored (id
cookie pointing at a store record, today's polystore model). server-next
currently hardwires the server-stored answer.

## What it would look like

- `ctx.session` is gone; the only concept users meet is `ctx.user`.
- The `sessions` store option stays as auth plumbing: fixed-schema login
  records (`{ user, provider, created }` + expiry) written at login, deleted at
  logout, never touched by app code. "Pass Redis here in production" remains
  the whole user-facing story.
- All strategies behave identically: switching `cookie`/`token`/`jwt` changes
  config, not app code.
- Login-time id rotation stays. Per-request session writes disappear (the
  store is read-only outside login/logout).

Deleted internally: the dirty-check snapshot (`loaded` WeakMap), the session
persist block in `parseResponse`, both `noSession` throwing proxies and their
error codes (SESSION_JWT, SESSION_GUEST), the `server<{ session: T }>` generic
slice, and the session sections of Context/Options/Concepts docs.

Follow-ups it unlocks: fixed-schema records make relational session tables
trivially correct, and revoke-by-user, list-my-devices and a joined
session+user read become well-defined features instead of recipes. Carrier and
storage decouple, so stateless cookie logins (signed JWT in an httpOnly
cookie, no store) become expressible.

## Pros and cons

Scope tags: [browser] anonymous server-rendered visitors, [cookies] cookie
logins, [api] `token` + `jwt` clients, [all].

### With sessions (status quo)

Pros:

- [browser & cookies] Server-side device state works out of the box: guest
  carts, wizards, flash messages, with zero client code.
- [browser & cookies] One familiar concept from the PHP/Django/Rails lineage;
  1.x migrators find what they expect.
- [browser] The server stays the source of truth for anonymous state (survives
  cleared localStorage, works before any JS runs).
- [browser] Guest identity comes free (the session id) for well-behaved-client
  features.

Cons:

- [api] The conflation leaks as strategy-dependent behavior: `token` guests
  and all of `jwt` throw on `ctx.session`, so the concept half-exists exactly
  where SPAs live.
- [browser] Guest records bloat the store with crawler/drive-by traffic.
- [all] Per-request dirty-check writes; the arbitrary-bag contract forces blob
  storage on SQL backends, keeping revoke-by-user/list-devices as recipes.
- [all] More surface: reserved fields, session typing, the `noSession`
  proxies, docs for all of it.
- [cookies] Logout kills the device state along with the login.
- [browser & cookies] The bag hardwires one storage opinion (server-stored).
  The client-carried camp is unserved, and serving both properly means real
  added surface: a storage mode, cookie encryption, 4KB-overflow semantics,
  two consistency models under one `ctx.session`.

Mitigations:

- [api] Document the per-strategy caveats prominently.
- [browser] TTLs and lazy minting (persist only when written) contain guest
  bloat.
- [browser & cookies] A pattern-2 recipe (payload blob + promoted indexed
  columns) restores relational queries over the blob.
- [browser & cookies] A cookie-backed polystore adapter could hide the
  client-carried/server-stored split behind the same interface, though 4KB and
  revocation semantics leak through.
- [all] Apps can treat it as pure login proof by never writing to it.

### Without browser sessions (the proposal)

Pros:

- [cookies & api] One concept: `ctx.user`, identical across strategies;
  switching changes config, not app code.
- [cookies & api] Fixed-schema login records: relational tables trivially
  correct; revoke-by-user, list-my-devices and the joined read become
  well-defined features.
- [browser] No guest records: the store grows with logins, not traffic.
- [cookies & api] No per-request session writes.
- [browser & cookies] Storage neutrality: the framework stops picking a side
  in the client-carried vs server-stored debate; both camps implement their
  preference as similarly-sized userland recipes, neither is second-class.
- [all] Smaller surface to build and document; carrier and storage decouple.

Cons:

- [browser] Server-side anonymous state is gone: guest carts, wizards, flash
  messages are DIY; server-rendered apps lose the most.
- [browser & cookies] Breaks 1.x parity further and every existing
  `ctx.session` user.
- [browser] Anonymous per-visitor features need their own cookie or `ctx.ip`.
- [cookies & api] Login metadata (`created`, `provider`) needs a new read-only
  home, or stays unexposed.
- [browser & cookies] No batteries-included answer for device state, and
  neutrality cuts both ways: users who want an opinionated default now face a
  choice the framework used to make for them.

Mitigations:

- [browser & cookies] A ~25-line userland recipe restores the bag (below);
  publishable as a docs recipe or tiny companion package.
- [browser & cookies] The signed-cookie-only variant covers small device state
  with no store at all.
- [api] SPAs mint visitor identity client-side; signed-in features key on
  `ctx.user`.
- [cookies & api] Internal login records keep revocation and production-store
  guidance unchanged; only the bag is removed.

Reality check on the "losses": for SPAs they were mostly already gone or never
session-shaped. `token`/`jwt` guests have no session today. Rate limiting
against adversaries was never cookie-sound (attackers drop the cookie), it
keys on `ctx.ip`. A/B bucketing needs one dumb cookie, not a server record,
and an SPA can mint its own visitor id client-side. The residual genuine loss
is server-rendered apps with real server-side guest state.

## The userland recipe

The framework's own implementation is a middleware plus a write at response
time; userland can replicate it with documented primitives:

```ts
declare module "@server/next" {
  interface ContextExtension { bag?: Record<string, any> }
}

const bags = kv(redis).prefix("bag:").expires("30d");
const loaded = new WeakMap();  // ctx -> { id, fresh, snapshot }

export default server({
  // The one "after the handler" position
  onResponse: async (res, ctx) => {
    const prev = loaded.get(ctx);
    if (!prev) return;
    if (prev.fresh) res.headers.append("set-cookie", `bag=${prev.id}; HttpOnly`);
    if (JSON.stringify(ctx.bag) !== prev.snapshot) await bags.set(prev.id, ctx.bag);
  },
})
  .use(async (ctx) => {
    const id = ctx.cookies.bag ?? crypto.randomUUID();
    ctx.bag = (await bags.get(id)) ?? {};
    loaded.set(ctx, { id, fresh: !ctx.cookies.bag, snapshot: JSON.stringify(ctx.bag) });
  });
```

Frictions: `onResponse` is a single global slot (composition is manual), the
dirty-check subtleties belong in a copy-paste recipe rather than derived by
users, and guests minting store entries returns as the app's informed choice.
The cookie-only variant avoids the store entirely.

## Where session bags get used, in general

Evidence from our own corpus first: across all 28 demos exactly one uses the
bag, `demo/session`, and it is the toy visit counter. Everything else only
passes the `sessions` store option for auth persistence.

The general-programming families, and how each decomposes without an ambient
session:

1. **Guest commerce state** [browser]: carts, checkout-in-progress. Becomes an
   explicit cart record with its own id (Shopify's cart token model): the
   add-to-cart route mints the id, stores through `kv`/DB, and sets the cookie
   in its own response. Only mutation routes write, so no dirty-check.
2. **Multi-step wizards** [browser]: becomes a draft record with the id in the
   URL, which beats the session version (resumable, shareable). Routes plus a
   store.
3. **UI crumbs** [browser]: flash messages, locale, return-to. Each is a
   cookie value set inline (`cookies({ flash: 'Saved' }).redirect('/')`),
   cleared on render. No server storage.
4. **Auth-adjacent transient state** [both]: OAuth state/PKCE, 2FA half-login,
   sudo mode, impersonation, CSRF. Login-lifecycle data: the framework owns it
   on or next to the login record (`oauth_state` already works this way as a
   signed cookie). Users build nothing.
5. **Per-login security metadata** [both]: last-seen, device labels, anomaly
   IPs. The one genuine hole: without the session concept there is no exposed
   login id to key an app-side table on (`ctx.user.id` is per-person, not
   per-device). Either the framework surfaces a read-only login id, or this
   family is framework-territory-or-nothing.
6. **Anonymous personalization** [browser]: A/B, metering, UTM attribution.
   Cookie values or `ctx.ip`; the bag was never load-bearing.
7. **Per-visitor server resources with TTL** [both]: fare holds, seat locks,
   cursors, conversation state. Explicit domain objects with their own ids and
   TTLs (`holds.add(seat)` with `.expires('10m')`), id returned in the JSON
   response. Works identically for browser and API clients.
8. **Framework-era mechanics** [browser, legacy]: `$_SESSION` as junk drawer,
   Rails flash, HttpSession clustering. The lineage the bag inherits from.

The pattern: the ambient session is an implicit parameter ("whoever holds this
cookie"), and every decomposition performs the same move, give the state an
explicit identity (cart id, draft id, hold id, login record) or admit it is a
cookie value. The userland answer is almost monotonous: mint an id, store a
record, hand the id back (cookie for browsers, JSON for APIs). No
`onResponse`, no dirty-check; that machinery exists only because the bag is
ambient and writes must be noticed behind the app's back.

Families 1-3 and 6 are app-specific enough that real apps outgrow the bag and
sidestep it anyway. Family 4 belongs to the framework's auth session. Family 7
wants explicit ids in both worlds. Family 5 is the only place removal leaves a
hole instead of a shorter version of the same code.

## What depends on `sessions`, and the polystore question

Everything in `src/` that touches the sessions store today:

1. The `ctx.session` bag itself: load in `middle/session.ts`, dirty-check
   persist in `parseResponse`.
2. Cookie-strategy logins: record written at login, id rotation
   (`finishLogin` deletes the previous id), per-request lookup in `getUser`.
3. Token-strategy logins: the same records keyed by the bearer credential.
4. Logout/revocation: `logout.ts` deletes the record.
5. WebSocket handshake auth: `socketUser` resolves `ctx.user` from the
   session store at upgrade time.
6. Login expiry: the default 1w TTL applied to raw stores at boot.
7. The production boot guard: non-`jwt` requires a persistent store.
8. The documented testing recipe: seed a session record + its cookie.
9. Latent: email reset tokens via `sessions.prefix("reset:")` (commented out
   in `providers/email.ts`).

Removing the bag (item 1) does not remove polystore on its own: items 2-5
survive as internal login records, and the `users` store also goes through
polystore's normalization (`toStore`/`toStoreExpiring` in `helpers/store.ts`).

It does make polystore droppable in principle. Fixed-schema records let the
framework own expiry in-record (an `expires` field checked on read, plus
pruning), and login/user records only ever use `get`/`set`/`del`: no
prefixes, no TTL envelope, no iteration. At that point any dumb
`{ get, set, del }` object satisfies the contract and polystore's remaining
value is:

- Sniffing raw sources so `sessions: redisClient` or a bare `Map` just works.
- The public `kv` export and the shipped-dependency story around it.
- Userland conveniences (`prefix`, `expires`, the adapter zoo) that apps can
  still install themselves.

Costs of actually dropping it: the "pass a raw Redis client" DX regresses to
"wrap it yourself", the framework takes on expiry pruning, and it unwinds the
recent decision to ship polystore as a dependency with `kv` as a public
export. A middle position exists: keep the dependency for normalization and
the `kv` export, but spec the internal contract as plain `get`/`set`/`del` so
the door stays open.

## Open questions

- Where does login metadata surface read-only, on `ctx.user`, a new small
  field, or nowhere? Related: is a read-only login id exposed, so apps can key
  per-device data (family 5) on it, and possibly extend the login record?
- Does the option stay `sessions` at the root or move to `auth.sessions`? Do
  the docs start saying "logins" for the records?
- Ship the device-state recipe in the docs, as a companion package, or not at
  all (to keep the concept dead)?
- Does `onResponse` need composability before the recipe becomes the blessed
  path?
- Should stateless cookie logins (signed JWT in httpOnly cookie, no store)
  ship as part of the same change, since the decoupling makes them cheap?
- Anonymous abuse control (`/auth/login` hammering): does `ctx.ip`-keyed rate
  limiting eventually become a framework feature, or stay userland?
- Does polystore stay a shipped dependency (normalization + `kv` export), get
  demoted to userland, or removed entirely with framework-owned expiry?
