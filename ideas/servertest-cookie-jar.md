# A cookie jar for `app.test()`

The test client sends whatever headers you hand it and throws the response away.
Cookies are never carried between calls, so the one thing `test()` exists for,
exercising a login flow end to end, is the one thing it cannot do.

```js
const api = server({ auth }).test();

await api.get("/auth/callback/github?code=...&state=...");  // sets the session cookie
await api.get("/me");                                       // 401, the cookie was dropped
```

Today every auth test either drives `credential.ts` directly or hand-copies
`set-cookie` from one response into the next request's headers.

## Shape

`ServerTest` in `src/ServerTest.ts` already has the placeholder where this was
meant to live (a commented-out `let cookie = ""`). The pieces:

- After each response, read `res.headers.getSetCookie()` and store the values in a
  `Map` keyed by cookie name, honouring `Max-Age=0` and a past `Expires` as a delete.
- Before each request, serialise the jar into a `cookie` header, but only when the
  caller did not set one, so an explicit header still wins.
- Expose `api.cookies` for assertions and `api.clear()` to start a fresh session,
  which is what a "signs out" test needs.

`parseCookies` and `createCookies` in `src/http/` already cover both directions.

## Worth deciding

- Whether the jar is on by default or opt-in (`server().test({ cookies: true })`).
  On by default is the useful behavior and matches what a browser does, but it makes
  previously independent calls share state, so a suite that reuses one `api` across
  tests could start seeing a logged-in user where it used to see an anonymous one.
- Whether to respect `Path` and `Domain`. A test client talking to one app can
  reasonably ignore both, and pretending to enforce them invites bug reports.
- A `socket()` helper has the same "cannot test it through `test()`" problem and
  would pair naturally with this, since an upgrade needs the session cookie.
