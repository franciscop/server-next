# CSRF

> This is part of the "Ideas", early thoughts not yet, or only partially, implemented to explore different ideas to see what works best.

General CSRF protection for user routes. OAuth login is already CSRF-protected
via the `state` token (`src/auth/state.ts`); this is about protecting the app's own
state-changing routes (POST/PUT/PATCH/DELETE), which today have no CSRF defense
beyond the `cookie` auth strategy's `SameSite=Lax`.

**Goal:** a zero-dependency, secure-by-default CSRF primitive using the existing
`secret` + cookie infrastructure. Signed double-submit token.

### Design
- Reuse `settings.secret` (already used to sign things) + `createCookies`
  (`src/helpers/createCookies.ts`).
- On a safe request (GET/HEAD/OPTIONS), issue a signed CSRF token in a cookie
  (readable by JS, i.e. NOT HttpOnly) so the client can echo it back.
- On an unsafe method (POST/PUT/PATCH/DELETE), require the token in a header
  (`x-csrf-token`) or form field, and validate it against the signed cookie.
  Reject mismatches with a typed error -> `403`.
- Expose the current token to handlers as `ctx.csrf` so JSX forms can embed it
  in a hidden input.
- Skip for the `token` (Bearer) auth strategy and for requests with no cookies
  (pure APIs don't need CSRF; it's a browser-cookie attack).

### Wiring
- New `src/middle/csrf.ts`, registered in the middleware stack near `session`.
- Config: fold into the existing `security` option
  (`security.csrf: boolean | { ... }`), off or on-by-default (decide). Default
  ON when a `cookie` auth strategy or a `session` store is configured, since
  that's when cookie-based CSRF matters.
- Errors: add a `CSRF_INVALID` code in `src/errors/` -> `403`.

### Tests
- token issued on GET; unsafe method without token -> 403; with a valid token
  -> passes; tampered token -> 403; Bearer/token strategy bypasses CSRF.
- Verify `ctx.csrf` is populated and stable within a request.

### Docs
- Document under `security` in `3. Options.md` and add a short Auth-guide note
  on embedding `ctx.csrf` in forms.
