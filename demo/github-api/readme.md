# Sign in with GitHub: a SPA and a bearer token

The page owns the credential and the server never sets a cookie for it. The
framework still runs the handshake, so the flow is three steps:

```
GET  /auth/login/github  (Accept: application/json)  → { url }
the page sends the visitor there; GitHub returns to /auth/callback/github,
which redirects to /#token=<jwt>
GET  /api/me  (Authorization: Bearer <token>)        → the user
```

The token rides in the URL fragment, which browsers never send to a server, so
it stays out of access logs and referrer headers. The page reads it on load and
stores it. CSRF `state` is handled by the server through a short-lived signed
cookie, which the login response sets even on the JSON answer.

Set `GITHUB_ID` and `GITHUB_SECRET`, and point the OAuth app's callback URL at
`http://localhost:3000/auth/callback/github`. Then `cd` into here and run
`bun .` (or `node .`).

See `../github-browser` for the same login kept in a cookie by the server.
