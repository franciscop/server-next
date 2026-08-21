# Plugins

Two related changes: let every `on*` hook take an array of modifiers instead of
a single function, and let `.use()` accept a named plugin object that bundles
middleware, hooks and routes.

## Why

Today each hook is a single slot on the options object:

```js
server({ onResponse: (res, ctx) => { ... } });
```

Only one owner per hook. An app that wants request logging *and* a security
header *and* a plugin's own hook has to hand-compose them into one function,
and a library cannot ship a hook at all without stealing the app's slot. This
is the concrete friction found while writing the device-state recipe: the
recipe needs `onResponse`, and so does everything else.

Meanwhile the built-ins already look like plugins internally: `auth(app)`
registers middleware plus a dozen routes (`src/auth/index.ts`), and `timer`,
`preflight`, `assets` and `openapi` are all registered through the same
`app.use()` / `app.get()` the user has. There is a shape here that is already
load-bearing and is simply not exposed.

## Part 1: hook arrays

```js
server({
  onResponse: [logTiming, addSecurityHeaders, plugin.onResponse],
});
```

A single function keeps working; an array runs them in order. The catch is
that "in order" means three different things, because the hooks are three
different shapes:

| Shape | Hooks | Array semantics |
|-------|-------|-----------------|
| **Event** | `onLogout` | Run all, ignore return values. Errors? See below |
| **Transformer** | `onResponse`, `onUser`, `onLogin`, `onProfile`, `onToken` | Reduce: each receives the previous value, `undefined` means "unchanged" |
| **Responder** | `onError` | First one to return a `Response` wins; fall through to the built-in default if none do |

`onResponse` is already written as a transformer (return a Response to
replace, nothing to keep it), so the reduction is natural. `onError` is not:
it must produce a Response and has a default, so an array is a chain of
attempts, which is the right shape for "this plugin handles ValidationError,
that one handles everything else".

The auth callbacks are the awkward set. They are documented as *replacing* the
built-in step, so as arrays they would become pipelines (`onLogin` chained over
the record). That is coherent but it changes their contract, and it is not
obvious anyone wants three things shaping one user record.

## Part 2: named plugins, registered at the root

Plugins are **global**: a plugin's hooks fire for every response, including
404s and static files. Since nothing about them is positional, they register
in one place rather than through `.use()`:

```js
server({
  plugins: [metrics({ path: '/stats' }), requestLog()],
});
```

`.use()` stays exactly what it is: positional middleware and router merging,
local to the routes after it. Mixing the two would put a global thing behind a
positional call, and a 404 has no route to read hooks from anyway. Vite,
Rollup, Webpack, Tailwind, Vue and Elysia each expose one registration door,
not two.

A plugin is an object with a required `name` plus whatever it contributes:

```js
{
  name: 'metrics',                      // required
  middleware: [collectStart],           // like .use(fn), applied globally
  onResponse: recordDuration,           // lifecycle hooks
  onError: recordError,
  install(app) {                        // routes, like auth(app) does today
    app.get('/metrics', { schema: false }, () => registry.export());
  },
}
```

`name` buys error messages that say which plugin threw, deduplication when two
packages depend on the same plugin, ordering constraints that reference other
plugins, and an introspectable `app.plugins`. Rollup makes `name` mandatory for
exactly the first reason; Elysia and Vue both track names for the second.

### Rejected: `server.plug(plugin)`

A module-level registration, `server.plug(x)` before `server()`, reads well and
is out. `server` is a module singleton, so it would register into the process
rather than into an app: every server created afterwards inherits it, and the
result depends on import order. This repo alone builds 401 `server()` instances
across a test suite that shares a process, and serverless environments reuse a
process across requests.

The ecosystem already ran this experiment. Vue 2 had exactly this API
(`Vue.use()`, global mixins) and it was a known source of test pollution and
SSR cross-request contamination; `createApp()` in Vue 3 exists largely to move
it per-app. Chai's `chai.use` and `dayjs.extend` kept the global form and are
still cited for it.

It also costs the property that `server(options)` fully describes an app:
answering "what does this app run" would mean reading the whole module graph,
since any imported file could register at import time.

If the appeal is call-site brevity, a factory keeps it without the shared
state: `const app = server.with(metrics())` returns a new configured factory
and mutates nothing.

### Why `install`, not `on*`

Three distinct moments hide behind the word "setup":

| Moment | When | Runs on Workers? |
|--------|------|------------------|
| **Registration** (`install(app)`) | `server()` is called; routes and middleware are added | yes, always |
| **Start / stop** (`onStart`, `onStop`) | the server begins or stops accepting connections | no, there is no listen step |
| **Per request** (`onResponse`, `onError`) | during a request | yes |

Naming registration `onStart` would collapse the first two, and the difference
is visible exactly where it hurts: on Workers a plugin's routes must still
register while its `onStart` never fires. Beyond that, `on*` in this codebase
means "something happened, react to it", and each such hook takes a subject
plus `ctx` and returns a meaningful value. `install(app)` is the opposite: it
receives the app, returns nothing, and works by mutation. Vue uses `install`
for this exact call shape (`app.use(plugin)` calling `plugin.install(app)`);
Fastify calls it `register`, Webpack `apply`.

### Class instances come for free

A class instance is already an object with the right fields, so nothing extra
is needed as long as the framework calls hooks as methods
(`plugin.onResponse(...)`) rather than detaching them. That gives real instance
state instead of closure variables:

```js
class Metrics {
  name = 'metrics';
  #hits = new Map();
  constructor({ path = '/metrics' } = {}) { this.path = path; }
  install(app) { app.get(this.path, { schema: false }, () => this.export()); }
  onResponse(res, ctx) { this.#hits.set(ctx.url.pathname, ...); }
}

server({ plugins: [new Metrics({ path: '/stats' })] });
```

Accepting an *uninstantiated* class and calling `new Plugin(app)` internally is
the tempting variant, and it does not pay off: the constructor cannot hold both
the app and the user's config (Fastify hit this and made plugins
`(fastify, opts, done)` functions instead), `constructor.name` is unreliable
under minification so an explicit `name` is needed anyway, and constructors
cannot be async. Webpack's `new Plugin(config)` in a root array, with an
`apply(compiler)` method, is the same split proposed here.

## Auto-loading the `@server/*` namespace

Since the namespace is owned, `npm i @server/metrics` could register itself
with no code at all. This is not a wild idea: **Laravel** discovers service
providers from `composer.json`, and **Rails** railties hook themselves in from
the Gemfile. Both are batteries-included frameworks, and the usual objection to
a magic prefix (typosquatting, the `grunt-*` era) does not apply when one
account controls publishing.

The blocker is discovery mechanics across the supported runtimes. Reading
`package.json` and importing a runtime-computed specifier works on Node and
Bun, but not on Workers (no filesystem) and not under bundlers, where
`import(variable)` defeats static analysis and the plugin is tree-shaken out.
`src/middle/openapi.ts` already reads `package.json` with a
`.catch(() => ({}))`, but there it is cosmetic; plugins would be load-bearing.
The options are to auto-discover only where a filesystem exists and require an
explicit list elsewhere, to generate an imports file at install or build time,
or to make discovery dev-only, which is the weakest since behavior would then
differ between environments.

If it does happen, several details follow:

- **Config by name.** A plugin named `x` reads `options.x`, which is already
  how `auth`, `openapi`, `uploads` and `public` behave. So
  `server({ metrics: { path: '/stats' } })` needs no new concept, an absent key
  means defaults, and `metrics: false` disables it.
- **Direct dependencies only.** Scan `package.json`, not `node_modules`, or a
  transitive `@server/*` pulled in by some library silently activates.
- **A deterministic order.** An array is self-documenting; discovery is not.
  Alphabetical is at least stable, though Vite's three-bucket
  `enforce: 'pre' | 'post'` is the cheap escape hatch that auth-like plugins
  would eventually need.
- **Startup visibility.** The log already prints one line per configured module
  (`[server:auth] github auth enabled`). Auto-loaded plugins printing the same
  way turns the main objection, invisible behavior, into something visible on
  every boot.
- **An opt-out**, which Laravel shipped from day one (`dont-discover`).

**The cheaper middle ground** is to use the namespace for *resolution* rather
than discovery, ESLint-style: `server({ plugins: ['metrics', 'session'] })`
resolving to `@server/metrics` and `@server/session`. Short names, guaranteed
ownership, but registration stays explicit, statically analyzable and
bundler-safe. It costs one line per plugin and is the difference between magic
and convention. Counter-evidence: ESLint's flat config moved away from string
resolution toward real imports.

## Prior art

| Tool | Shape | Name required | Ordering |
|------|-------|---------------|----------|
| Vite / Rollup | `plugins: []` root array | yes | array order + `enforce: 'pre'\|'post'` |
| Webpack | `plugins: [new P()]` root array | by class | array order |
| Tailwind, Astro, Nuxt, ESLint | root array | varies | array order |
| Vue | `app.use(plugin, opts)`, `{ install }` | no, but duplicate installs warn | call order |
| Fastify | `fastify.register(plugin, opts)` | via `fastify-plugin` | call order + `dependencies` |
| Elysia | `.use(plugin)` | yes, for deduplication | call order |
| Express / Koa / Hono | middleware only, no plugin concept | n/a | call order |
| Laravel / Rails | auto-discovered from the manifest | n/a | framework-defined, with opt-out |

The one capability the call-based family has that a root array cannot offer is
Fastify's **encapsulation**: each `register()` opens a scope whose hooks and
decorators do not leak to the parent. That matters less here, since route-level
composition is already covered by `router()` merging and the lifecycle hooks
were never scopable.

## Other important bits

**Ordering.** Array order is the obvious default, but plugins that must run
first (auth loading `ctx.user`) or last (compression) need something, and
auto-discovery has no array to order. Vite's three-bucket
`enforce: 'pre' | 'post'`, sorted stably within each bucket, is the cheapest
thing that covers both cases; declared dependencies (`after: ['auth']`) are
more machinery than most apps need.

**Failure containment.** If one modifier in an array throws, the choices are:
fail the request (consistent, one bad plugin takes the app down), skip that
modifier and continue (resilient, hides bugs), or let each hook type decide
(events swallow and log, transformers propagate). Whatever it is, the error
should name the plugin.

**Extending `ctx`.** A plugin that sets `ctx.session`, `ctx.db` or `ctx.metrics`
needs the field typed. Today that is `ContextExtension` module augmentation,
which a plugin package can ship in its own `.d.ts`, and it composes because
interfaces merge. Worth documenting as the blessed pattern rather than
inventing a plugin-scoped typing mechanism.

**Server lifecycle.** Nothing exists today for "the server started" or "the
server is shutting down". A plugin that opens a connection pool, starts a cron,
or flushes a metrics buffer wants `onStart(app)` and `onStop(app)`, and the
latter needs graceful shutdown to exist at all (drain in-flight requests, then
close). That is a real gap independent of plugins, and plugins make it visible.

**Dedup and conflicts.** Two copies of the same plugin (transitive deps) should
either throw or collapse to one; two plugins registering the same route path
should throw, since first-match-wins would silently shadow. Names make both
detectable.

**Introspection.** `app.plugins` listing name plus what each contributed makes
"why did my response get this header" answerable. It also gives the OpenAPI
generation a way to attribute plugin-registered routes.

**Sockets.** `.socket()` events run outside the HTTP chain entirely, so a
plugin that wants to observe connections needs its own hooks (`onConnect`,
`onDisconnect`) or it silently covers only half the app.

**Dogfooding.** The strongest validation is converting the built-ins: `timer`,
`preflight`, `assets`, `auth` and `openapi` all become plugins registered by
`config`. If the interface can express auth (middleware + 12 routes + its own
options + a spec tag), it can express anything a user needs. It would also let
apps reorder or disable a built-in, which is impossible today.

**Ecosystem shape.** With the namespace in play the convention is `@server/*`
itself, so what remains is stating what counts as public API for plugin authors
(which `ctx` fields and helpers are stable) and a version-compatibility story,
because a plugin reaching into internals breaks on every release otherwise.
Third-party plugins outside the namespace need a convention too, since they
cannot be auto-loaded.

## Where the pieces came from

Nothing here is decided. Separating the premise from the analysis, since they
read the same on the page:

**The starting proposal**: hooks take arrays instead of a single function, and
plugins are objects that must carry a `name`.

**Stated preference**: plugins are global (no per-path), and registering them
at the root rather than through `.use()` looks right, since nothing about a
global thing is positional.

**Suggestions from working through it**, all still open: `install(app)` rather
than an `on*` name for registration; accepting class instances but not
uninstantiated classes; reducing hook arrays by shape (event, transformer,
responder); config by name (`options.x`) if auto-loading happens.

## Open questions

- Auto-discovery of `@server/*`, explicit-list-with-short-name resolution, or
  plain imports? The runtime/bundler constraint decides most of it.
- Do the auth callbacks join the array treatment, or stay single-owner
  replacement hooks?
- Is `install(app)` handed the whole app, or a restricted surface (no
  `app.settings` mutation, for instance)?
- Does a plugin get to change resolved settings, or only observe them?
- Is graceful shutdown in scope for the same change, given `onStop` needs it?
- Do the built-ins convert in the same release, or is that a follow-up once
  the interface has settled?
- What ordering control ships: array order alone, or Vite-style
  `enforce: 'pre' | 'post'`?
