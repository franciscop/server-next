# Logout does not sign out a `token` or `jwt` credential

Measured end to end through a real login, after the `onLogout` fix:

```
session  logout=302  me-after=401   signed out
cookie   logout=302  me-after=401   signed out
token    logout=204  me-after=200   still authenticated
jwt      logout=204  me-after=200   still authenticated
```

The cookie strategies clear the cookie, so logout works. The bearer strategies handed
the credential to the client, and `POST /auth/logout` cannot take it back: it returns
`204` and the token keeps working until it expires.

## Where each one stands

- **`token`** is recoverable by the app. The credential holds an id, `getUser` runs on
  every request, and `onLogout` now fires, so deleting the session row there is a real
  logout. That is what the revocable-sessions tutorial does.
- **`jwt`** cannot be revoked without new machinery. The credential is self-contained
  and verified from `secrets` with no lookup, so nothing consulted at request time can
  refuse it. `onLogout` fires now, but there is nowhere for it to write that the
  framework would then read.

## Options for `jwt`

- **Say so in the docs.** Cheapest, and probably necessary regardless: stateless
  credentials cannot be revoked, so pick a short `expires` and use `token` if you need
  logout to be immediate.
- **Sign a `jti`** and let an app-supplied denylist be consulted during `read()`. That
  turns `jwt` into `token` with extra steps, which is an argument against it.
- **Nothing.** It is how stateless JWT works everywhere, and the strategy exists
  precisely to avoid a per-request lookup.

The first is the one to do. Nothing in `docs/5. Authentication.md` currently tells a
reader that choosing `jwt` means logout is advisory.
