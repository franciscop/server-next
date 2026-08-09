# Router untangling

> Draft. A mental model to document (and keep true as we grow).

There is one idea that makes the whole router predictable: **global is just a
default that gets flattened onto each route.** `.use()` and the server options
aren't a separate runtime layer, they're sugar for repeating something on every
route defined after them.

## Middleware

```js
export default server()
  .use(A)
  .get('/b', B)
  .get('/c', C);
```

is the same as writing:

```js
export default server()
  .get('/b', A, B)
  .get('/c', A, C);
```

This isn't just conceptually true, it's how it already works: when a route is
registered, the current `.use()` middleware is baked into that route's chain
(`fns = [...middleware, ...routeMiddleware]`). At request time a matched route
just runs its own flat `fns` list, there's no second global pass.

Merging a router works the same way: `.use(subRouter)` copies the sub-router's
routes in, prepending the server's current middleware to each one's `fns`. A
merged route is indistinguishable from one written inline.

Two things fall out of this model, and both are *features*:

- **`.use()` only affects routes defined after it.** It prepends to the
  subsequent routes, not the earlier ones. Order is meaningful and local.
- **There's no hidden global stack.** What a route runs is exactly its `fns`;
  you could print them.

## Configuration, the same shape

Options work the same way. A global option is the **default each route
inherits**, and a route can override it (local wins):

```js
server({ cache: false })            // default for every route
  .get('/a', () => ...)             // cache: false (inherited)
  .get('/b', { cache: '1h' }, ...); // cache: '1h' (overridden)
```

Today this is real for `parser` and `cache`; the plan (see
[per-route.md](./per-route.md)) is to make the other resolvable behavior
options (starting with `uploads`) work per route the same way, so:

```js
server({ uploads: './uploads' })
  .post('/avatar', { uploads: './avatars' }, ...);
```

reads exactly like the middleware example above: the global value is the
per-route default, and a route restates it to differ.

The validation schemas (`body`, `query`, `params`, `response`) are the same
model taken one step further: they're per-route values with **no global
default** at all, since one schema could never describe every route. The
model doesn't require every route value to have a root form, only that root
values reduce to route values.

## The exceptions, and why they're deliberate

Some options are root-only on purpose, and the line between them and the
flattened ones is worth keeping crisp:

- **Policy, not behavior.** `security` (headers, `trustProxy`,
  `traversalProtection`, `maxBody`) is an app-wide guarantee. A cap or header
  that silently varied per route would be exactly the kind of hidden layer
  this model exists to avoid, and auditing "what does this app enforce"
  should never require reading every route.
- **Wiring, not requests.** `auth`, `session`, `store`, `port`, `log` describe
  how the app is assembled (providers, stores, the listener), not how one
  request behaves. There is no meaningful per-route value for them; per-route
  *authorization* is a middleware concern (a guard in the chain), not an
  option.

So the invariant, stated precisely: **every per-request behavior option must
reduce to a value on each route** (flattened defaults, local wins), while
policy and wiring stay at the root, visible in one place. If a new option
doesn't clearly fall on one side of that line, that's the design discussion
to have before adding it.

## Why keep this invariant

If middleware and behavior config always reduce to "a value on each route",
then:

- The router has **one** rule instead of two (a global layer + a route layer).
- Everything is inspectable per route (great for OpenAPI, debugging, a future
  route table dump).
- New per-route options are free: they're just another key that defaults from
  the server and overrides locally, no new runtime concept.
