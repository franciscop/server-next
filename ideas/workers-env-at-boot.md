# Env-driven options never apply on Cloudflare Workers

On Workers, environment variables are not in `process.env` at import time: they
arrive as the second argument of the first `fetch(request, env)`. Server.js
merges them into `globalThis.env` there, but `config()` has already run by then,
in the `Server` constructor, which happens when the module is imported.

So on Workers these five options silently ignore their environment variable:

| Variable  | Option    | Read in                      |
|-----------|-----------|------------------------------|
| `PORT`    | `port`    | `config()`, constructor      |
| `SECRETS` | `secrets` | `resolveSecrets()`, constructor |
| `AUTH`    | `auth`    | `config()`, constructor      |
| `CORS`    | `cors`    | `config()`, constructor      |
| `PUBLIC`  | `public`  | `config()`, constructor      |

`SECRETS` is the one that bites: with no value found, a random key is generated
per isolate, so a credential signed by one isolate fails in the next. Anything
read lazily per request (the OAuth `<NAME>_ID` / `<NAME>_SECRET` pairs) does see
the merged values.

Passing the options explicitly works, since an explicit option wins over its
variable; only the environment fallback is broken.

## Worth deciding

- Resolve the env-driven options lazily, on the first request, when the provider
  is Workers. That keeps one code path but moves boot errors (a bad `AUTH`
  string) from import time to the first request.
- Or read Workers' env at import time through `import { env } from
  "cloudflare:workers"`, which recent Workers runtimes expose. It is a static
  import of a Workers-only module, so it has to stay behind a dynamic `import()`
  to keep the bundle loadable elsewhere, and top-level await is not available on
  every platform that loads it.
- Or document it: on Workers, pass these options explicitly.
