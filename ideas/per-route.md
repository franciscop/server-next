# Per-route options

> Draft. Not implemented yet.

Route methods already accept an options object as the 2nd argument, between the
path and the middleware:

```js
.METHOD(PATH, OPTIONS?, ...MIDDLEWARE)
```

Today `OPTIONS` (the `RouteOptions` type) supports `body`, `cache`, `tags`,
`title` and `description`, and a route's value overrides the server default for
that request (local wins). The idea here is to extend that to the other options
that make sense per route, so a section of the app can differ without a second
`server()` or `router()`.

## `uploads` per route (the driver for this)

The one we want first: a different upload destination (and validation) per
route, so avatars, videos and documents can go to different folders/buckets with
different limits.

```js
export default server()
  .post("/avatar", { uploads: "./avatars" }, (ctx) => {
    console.log(ctx.body.avatar);
    // { id, name, path, type, size }
  })
  .post("/videos", { uploads: { bucket: videos, maxSize: "500mb" } }, (ctx) => {
    // ...
  });
```

Global stays the default; a route's `uploads` replaces it just like `body`/`cache`.

## Why it doesn't work today

Two gaps:

1. `uploads` isn't in `RouteOptions` (`src/types.ts`), so it doesn't typecheck.
2. Route options are merged **raw** (`handleRequest.ts`: `ctx.options = { ...app.settings, ...route.options }`). The server-level `uploads` is normalized to a `Bucket` (plus `uploadLimits`) in `config.ts`, but a per-route `uploads: "./avatars"` would land on `ctx.options.uploads` as a plain **string**, and `parseBody` calls `.file()` / `.folder()` on it, which throws.

`body` and `cache` work per route only because their raw value is *already* the
final shape the request path consumes; `uploads` needs resolving first.

## Sketch

- Add `uploads?: string | Bucket | UploadOptions` to `RouteOptions`.
- Factor the uploads-normalization out of `config.ts` (the string/Bucket/object
  → `Bucket` + `uploadLimits` logic) into a shared helper.
- Apply it when a route's options are merged (or lazily in `resolveBody`), so
  `ctx.options.uploads` is always a resolved bucket regardless of origin.
- Same pattern would let other resolved options (`cors`, `security`, `session`,
  `auth`) go per-route later, each reusing its own normalizer.

## Open questions

- Resolve at registration (once) vs. per request (cheaper table, tiny per-req cost)?
- Does a per-route `uploads` object with limits share the server's, or fully replace?
- How does it interact with the 1mb buffered-`body` limit (files stay exempt, so probably no change).
