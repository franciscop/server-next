# Route-level guards

Access checks live in two places today:

- **Inline checks** in the handler (`if (!ctx.user) return 401`). They narrow
  `ctx.user`'s type, but they run after the body is parsed, so they cannot
  protect an upload.
- **`uploads.validate`**, which runs before the body with `ctx.user` resolved,
  but only for uploads, and server-wide rather than per route.

A guard middleware fits neither: `.use()` always runs after the body, and it
cannot narrow types (`Middleware<{ user: User }>` is a type you declare
yourself, which TypeScript takes on trust without checking).

## The idea

A `guard` route option, run as a pipeline step after `resolveUser` and before
`resolveBody`:

```ts
const signedIn = (ctx) => ctx.user ? { user: ctx.user } : 401;

server({ auth })
  .post('/article/:id/cover', { guard: signedIn }, (ctx) => {
    ctx.user.id;    // narrowed by the guard's return type
    return ctx.body.cover;
  });
```

- Runs before a byte of the body is read, so it protects uploads per route.
- Its return type narrows the handler's context, which middleware cannot.
- Same refusal shapes as `uploads.validate`: `false` for `403`, a status, or
  a thrown `ServerError`.
- `uploads.validate` stays as the server-wide hook for every upload.

## Open questions

- Return shape: a context patch (`{ user }`) that narrows, or a boolean with
  narrowing through a type predicate (`(ctx) => ctx is ...`).
- One guard or an array, and whether routers can set a default for all their
  routes.
- Whether it overlaps enough with inline checks to justify a second way of
  writing the same thing; inline checks are the documented choice today.
