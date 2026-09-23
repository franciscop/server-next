# A request to an unmatched route stores its uploads

When no route matches, `getResponse` still reads the body before running the
global middleware (`src/pipeline/handleRequest.ts`, the `if (!matched)` branch),
and that path never calls `resolveUser` or `checkUploads`. So `uploads.validate`
is skipped, and the files are written before the 404:

```js
server({ uploads: { bucket, validate: () => false } })
  .post("/upload", (ctx) => ctx.body);
```

```
POST /upload          -> 403 | stored: 0
POST /does-not-exist  -> 404 | stored: 1
```

That defeats `validate` as a guard against anonymous uploads, and lets anyone
fill the bucket with requests to made-up URLs.

## Worth deciding

- **Don't read the body when nothing matched.** The only built-in on that path is
  `assets`, which serves GET/HEAD and never reads it. But `.use()` middleware
  also run there, and they are promised a parsed `ctx.body`.
- **Run `resolveUser` and `checkUploads` there too**, so the unmatched path gets
  the same guards as a matched one. Keeps the `.use()` promise, but a 404 can
  still store files when `validate` allows it.
- **Read it without `uploads`** on the unmatched path: fields parse, files are
  refused or dropped. A body with files then fails differently on a 404 than on
  a real route.
