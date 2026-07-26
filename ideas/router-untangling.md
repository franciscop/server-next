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

Today this is real for `body` and `cache`; the plan (see [per-route.md](./per-route.md)) is to
make every resolvable option work per route the same way, so:

```js
server({ uploads: './uploads' })
  .post('/avatar', { uploads: './avatars' }, ...);
```

reads exactly like the middleware example above: the global value is the
per-route default, and a route restates it to differ.

## Why keep this invariant

If both middleware and config always reduce to "a value on each route", then:

- The router has **one** rule instead of two (a global layer + a route layer).
- Everything is inspectable per route (great for OpenAPI, debugging, a future
  route table dump).
- New per-route options are free: they're just another key that defaults from
  the server and overrides locally, no new runtime concept.

The one thing to preserve as we add features: never introduce a global that
*can't* be expressed as a per-route value. If it can't be untangled, it doesn't
belong on `server()`.
