# Production by default, development when told

One value says whether the app runs in production, `platform.production`,
resolved once at boot and fixed for the life of the runtime. It is `false` only
when development is explicit:

- `NODE_ENV` is `development` or `test`
- `NETLIFY_DEV` is `true`, as `netlify dev` sets it

Anything else is production, including no `NODE_ENV` at all.

The environment is complete at import on every platform: `polyfill.ts` merges
Netlify's env, `process.env`, and on Cloudflare Workers the `env` from
`cloudflare:workers`, before any other library code runs. So `platform.production`
can be resolved when `server()` runs, on every platform.

## Plan

1. **Resolve it once, in `getMachine()`.** It reads the merged `env` instead of
   `process.env`, so a Worker's `NODE_ENV` counts. This is the only code that
   reads `NODE_ENV`: the direct reads in `config.ts` and `render.ts` go through
   `platform.production` instead.
2. **The banner, from the same place.** When `NODE_ENV` is not set at all,
   `getMachine()` warns once: `[server:app] NODE_ENV is not set, so production
   defaults apply. Set NODE_ENV=development when developing locally.` Nothing is
   printed when it is set, whatever its value. This replaces
   `announceDevelopment()` in `config.ts`.
3. **`Secure` cookies in production.** The auth cookie and the OAuth state
   cookie (`authCookie()` in `credential.ts`) already follow
   `platform.production`; they now get `Secure` by default. Not on in development:
   the browser rejects a `Secure` cookie over plain HTTP, and Safari does even on
   `localhost`, so the login would break.
4. **HSTS always.** Drop the `platform.production` gate in `security.ts`, like
   Hono's `secureHeaders()`. Browsers ignore it over plain HTTP.
5. **Remove the `localhost` CORS exception.** `cors()` in `cors.ts` lets any
   `localhost` origin through when not in production. No other library does
   this; allowed origins are the ones listed in `cors`.
6. **The HTML error page only in development.** `defaultOnError` in `render.ts`
   shows the message, hint and stack when `platform.production` is `false`, and
   a plain status otherwise, so a forgotten `NODE_ENV` no longer shows them to
   visitors. That is Express's footgun.
7. **Docs.** `docs/1. Options.md` (`cors`, `security`), `docs/3. Context.md`
   (`ctx.platform`), `docs/8. Errors.md` ("In development"), and
   `docs/0. Documentation.md` where `NODE_ENV` is mentioned.

## Undecided

- **The random auth secret** (`checkAuthSecret()` in `config.ts`): allowed when
  `platform.production` is `false`, refused at boot otherwise.

## Breaking

An app that relied on unset `NODE_ENV` behaving as development (the error page,
non-`Secure` cookies over HTTP, `localhost` passing CORS) now has to set
`NODE_ENV=development`, or list its `localhost` origin in `cors`.
