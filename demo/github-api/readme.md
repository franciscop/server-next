# Sign in with GitHub: client-owned flow

The SPA flow: the page drives the redirect and the server only exchanges the
code, so nothing here uses cookies. The credential is a bearer token the client
stores and sends itself.

```
GET  /auth/login/github  (Accept: application/json)  → { url }
the page redirects, GitHub returns to /callback?code&state
POST /auth/verify/github { code }                    → { ...user, token }
GET  /api/me  (Authorization: Bearer <token>)        → the user
```

The page issues and checks its own `state`, since the server never sees it (it
would need a cookie to remember one). PKCE works the same way: pass
`code_challenge` to the login URL and `code_verifier` to the verify call.

Set `GITHUB_ID` and `GITHUB_SECRET`, and point the OAuth app's callback URL at
`http://localhost:3000/callback`, this app's own page rather than an API route.
Then `cd` into here and run `bun .` (or `node .`).

See `../github-browser` for the same login through the server-owned flow.
