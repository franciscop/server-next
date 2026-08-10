# Sign in with GitHub: server-owned flow

The browser flow: the server drives the redirects, the session lives in an
`HttpOnly` cookie, and there is no client-side code at all.

```
GET /auth/login/github  → 302 to GitHub (+ oauth_state cookie)
GitHub                  → GET /auth/callback/github?code&state
server checks the state → logs in → 302 with the session cookie
```

Set `GITHUB_ID` and `GITHUB_SECRET` (the OAuth app's callback URL must be
`http://localhost:3000/auth/callback/github`), then `cd` into here and run
`bun .`. Bun is required for the small bit of JSX.

See `../github-api` for the same login from a client-owned (SPA) flow.
