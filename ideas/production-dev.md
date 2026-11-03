# Production by default, development when told

Anything other than an explicit development environment runs with production
behavior, including no `NODE_ENV` at all. Development is `NODE_ENV=development`,
or `NETLIFY_DEV=true` under `netlify dev`.

## Plan

1. **One value per runtime.** The mode is resolved once, at boot, and never
   changes after that. The public `platform.production` holds it, and every
   framework check reads it, replacing the scattered
   `env.NODE_ENV === "production"` reads. On Workers the env has to be readable
   at import time for this: verify that `process.env` is filled there under
   `nodejs_compat` (compatibility date 2025-04-01 or later), and otherwise read it
   from `import { env } from "cloudflare:workers"`.
2. **`Secure` cookies unless development.** The auth cookie and the OAuth state
   cookie (`authCookie()` in `credential.ts`). Not always on: the browser rejects
   a `Secure` cookie over plain HTTP, and Safari does even on `localhost`, so the
   login would break in development.
3. **HSTS always.** Drop the production gate in `security.ts`, like Hono's
   `secureHeaders()`. Browsers ignore it over plain HTTP.
4. **Remove the `localhost` CORS exception.** `cors()` in `cors.ts` lets any
   `localhost` origin through outside production. No other library does this;
   allowed origins are the ones listed in `cors`.
5. **The HTML error page only in development.** `defaultOnError` in `render.ts`
   shows the message, hint and stack unless `NODE_ENV=production`, which is
   Express's footgun when it is forgotten.
6. **The banner only when `NODE_ENV` is unset.** `announceDevelopment()` in
   `config.ts` becomes, once at boot: `[server:app] NODE_ENV is not set, so
   production defaults apply. Set NODE_ENV=development when developing locally.`
   Silent for `production`, `development` and `test`, which were all set on
   purpose.
7. **Docs.** `docs/1. Options.md` (`cors`, `security`), `docs/3. Context.md`
   (`ctx.platform`), `docs/8. Errors.md` ("In development"), and
   `docs/0. Documentation.md` where `NODE_ENV` is mentioned.

## Undecided

- **The random auth secret** (`checkAuthSecret()` in `config.ts`): allowed only in
  development and `test`, refused at boot otherwise. On Workers this relies on
  the same import-time env as step 1.

## Breaking

An app that relied on unset `NODE_ENV` behaving as development (the error page,
non-`Secure` cookies over HTTP, `localhost` passing CORS) now has to set
`NODE_ENV=development`, or list its `localhost` origin in `cors`.
