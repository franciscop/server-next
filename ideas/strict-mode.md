# Enable strict mode

`tsc --strict` reports 48 errors, 26 of them in `src` (the rest in tests). Every
one below is a real inconsistency rather than noise, and each is small.

## In `src`

- **`onError` is optional but always called.** `Settings.onError` is typed
  optional, while `config()` always assigns one and `handleRequest` calls it
  unconditionally. Make it required in `Settings`.
- **`null` vs `undefined` in `config.ts`.** `settings.public`, `settings.auth`
  and `options.cors` are assigned `null` where `Settings` says `undefined` (five
  errors). Pick one convention in `Settings`.
- **OIDC sends `"undefined"`.** `oidc.ts` puts `string | undefined` credentials
  into a `URLSearchParams` record, so a missing `<NAME>_ID` env var sends the
  literal string `"undefined"` to the token endpoint instead of failing.
- **Auth resolvers are typed against the wrong context.** Four resolvers
  (`flow.ts`, `instance.ts`, `parse.ts`, `verify.ts`) take `Context` where
  `AuthEntry.user` expects `AuthContext`.
- **Route options after resolution.** `handleRequest` and `router.ts` pass the
  resolved route options (where `uploads` is already a bucket) to functions
  typed for the input shape (three errors).
- **Framework middleware does not fit `Fn<C>`.** The constructor's
  `app.use(timer)` and friends need the `this as unknown as Server` cast; the
  built-in middleware should be typed for any context.
- Small ones: `fetch`'s optional `env` passed to a required parameter
  (`index.ts`), `ctx.time` possibly unset in `parseResponse.ts`, header values
  possibly `undefined` in `reply.ts`, a nullable regex match in
  `createCookies.ts`, the duration table index in `duration.ts`, and
  `ServerTest`'s optional body.

## In tests

22 errors, mostly `ctx.url.params` typed loosely in inline handlers and a few
`possibly undefined` reads. Worth fixing alongside, since `strict` applies to
the whole project.
