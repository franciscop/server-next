# Per-route options

> This is part of the "Ideas", early thoughts not yet, or only partially, implemented to explore different ideas to see what works best.

Route methods already accept an options object as the 2nd argument, between the
path and the middleware:

```js
.METHOD(PATH, OPTIONS?, ...MIDDLEWARE)
```

Today `OPTIONS` (the `RouteOptions` type) supports `parser`, the validation
schemas (`body`, `query`, `params`, `response`), `cache`, `tags`, `title` and
`description`, and a route's value overrides the server default for that
request (local wins). The idea here is to extend that to the other options that
make sense per route, so a section of the app can differ without a second
`server()` or `router()`.

Not everything qualifies: `security` (including `maxBody`) and `auth` are
deliberately root-only. Security policy is app-wide, and `auth` only carries
the global wiring (providers, strategy, stores), not per-route authorization.

## `uploads` per route (the driver for this)

The one we want first: a different upload destination (and validation) per
route, so avatars, videos and documents can go to different folders/buckets
with different limits.

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

Global stays the default; a route's `uploads` replaces it just like
`parser`/`cache`.

## Why it doesn't work today

Two gaps:

1. `uploads` isn't in `RouteOptions` (`src/types.ts`), so it doesn't typecheck.
2. Route options are merged **raw** (`handleRequest.ts`: `ctx.options =
   { ...app.settings, ...route.options }`). The server-level `uploads` is
   normalized to a `Bucket` (plus limits) in `config.ts`, but a per-route
   `uploads: "./avatars"` would land on `ctx.options.uploads` as a plain
   **string**, and `parseBody` calls `.file()` / `.folder()` on it, which
   throws.

`parser` and `cache` work per route only because their raw value is *already*
the final shape the request path consumes; `uploads` needs resolving first.

## Sketch

- Add `uploads?: string | Bucket | UploadOptions` to `RouteOptions`.
- Factor the uploads-normalization out of `config.ts` (the string/Bucket/object
  → `Bucket` + limits logic) into a shared helper.
- Apply it when a route's options are merged (or lazily in `resolveBody`), so
  `ctx.options.uploads` is always a resolved bucket regardless of origin.
- The same pattern could take `cors` per route later, reusing its normalizer.

## Open questions

- Resolve at registration (once) vs. per request (cheaper table, tiny per-req
  cost)?
- Does a per-route `uploads` object with limits share the server's, or fully
  replace?
- No interaction expected with `security.maxBody` (root-only): file bytes are
  exempt from it and bounded by the upload limits instead.
