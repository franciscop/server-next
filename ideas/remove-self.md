# Remove `.self()`, fix `fetch()`'s type, enable strict mode

Three changes that reshape the same surface, done as one flagged release: make
`server()` return the `Server` instance itself instead of the callable facade
that `self()` builds, make `fetch()` return `Promise<Response>`, and flip
`strict: true` in tsconfig. The first is a breaking change to the export shape
and needs a migration note; the other two ride along because they touch the
same files and the strict flip depends on the `fetch()` fix.

## What `.self()` does today

`server()` returns `new Server(options).self()` (`src/index.ts`). `self()`
takes `this.callback` (the Netlify-style `(request, context) => Response`
handler), binds it, and copies every method and property onto it. The default
export is therefore simultaneously a callable function and an app object with
`.fetch`, `.get()`, `.websocket`, and so on.

The copy loop is fragile in a specific way: `Object.keys` on a class prototype
is always empty (class methods are non-enumerable), so the verb methods survive
only because `this.handlers` happens to be keyed `get`/`post`/etc, plus a
hardcoded list (`use`, `node`, `fetch`, `callback`, `test`). Any method added to
`Server` outside that list silently disappears from the returned app. On top of
that, `handle()` and `use()` return `this.self()`, so the whole facade is
rebuilt on every route registration.

## What removal loses

- The directly-callable default export. Only platforms that invoke the default
  export as a plain handler function rely on it: Netlify Edge Functions, and
  runtimes with the same convention (Vercel Edge style). Bun and Cloudflare
  never call the export; they read `.fetch` (Bun also `.websocket`), which an
  instance satisfies. The migration for Netlify Edge is one line:

  ```js
  export default app.callback;
  ```

- The implicit binding guarantee. `self()` binds every copied method, so a
  platform that plucks `fetch` off the export and calls it bare still works.
  Keep that by making `fetch` and `callback` bound arrow class fields.

## What removal wins

- `instanceof` works again. Today `server() instanceof Router` is false, which
  silently breaks the `arg instanceof Router` branch in `Router.use()` when a
  server is passed as a sub-router.
- Methods can no longer vanish by accident; adding a public method to `Server`
  just works.
- No facade rebuild on every `.get()` call; chaining returns `this`.
- Honest types: no `as any` casts around the facade, and `Server<C>`'s generic
  flows through chaining naturally.

## Sketch

```js
export default function server(options) {
  return new Server(options);
}

class Server extends Router {
  // Bound fields so a plucked handler still works
  fetch = (request, env) => handlers.Winter(this, request, env);
  callback = (request, context) => handlers.Netlify(this, request, context);
}
```

`handle()`/`use()` return `this`. Delete `self()`. Document the Netlify Edge
migration in the changelog.

## Companion: `fetch(): Promise<Response>`

`handleRequest` returns `Promise<Response | undefined>` solely for the Netlify
passthrough (a non-response falls through to the original resource). That
union propagates through `Server.fetch` and `ServerTest` into every test.

Measured with `tsc --strict`: 505 errors project-wide, of which ~407 are
`'res' is possibly 'undefined'` traced to this one signature. Fix by making
the passthrough Netlify-only: `fetch()` and the Node adapter always produce a
Response (they already do at runtime; a no-match throws `NOT_FOUND`), and only
`callback()` keeps the `| undefined` escape hatch.

## Companion: `strict: true`

After the `fetch()` fix, ~28 real errors remain, all worth fixing:

- `Settings.onError` is optional but called unconditionally in
  `handleRequest`; make it required (config always assigns it).
- Six `null` vs `undefined` mismatches in `config.ts` (`settings.public`,
  `settings.auth`); pick one convention in `Settings`.
- `oidc.ts` passes `string | undefined` credentials into a
  `Record<string, string>`, so a missing env var sends the literal string
  `"undefined"` to the token endpoint today.
- `app.use(assets)` does not satisfy the `Middleware` type; framework
  middleware does not fit its own public type (related to the fallback-stage
  idea).
- A handful of implicit-any index signatures (`self()`'s key loop dies with
  `self()` itself, the duration table in `createCookies`, `ServerTest`
  headers).
