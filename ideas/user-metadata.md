# What `ctx.user` carries with no callbacks

With no `getUser`, the login flow signs the profile into the credential, but not all
of it. `publicProfile` in `src/auth/credential.ts` keeps four fields:

```js
const publicProfile = ({ id, email, name, avatar }) => ({ id, email, name, avatar });
```

So `accessToken`, `refreshToken`, `raw` and `provider` never reach `ctx.user`. Three
places in `docs/5. Authentication.md` (84, 124 and the table row at 646) say the
profile itself becomes `ctx.user`, which is why this needs settling before the docs
can be corrected: writing "it is these four fields" documents a limitation we may not
want to keep.

## What already exists

`ctx.auth` carries some of it: `{ issuedAt, expiresAt, strategy, provider }`, so the
provider is available, just not on `ctx.user`.

## The tension

The credential is a signed cookie the client holds and can read. Anything put in it is
published to the browser, which is exactly why the access token is dropped: a leaked
cookie would become a live credential for somebody's GitHub account. So the subset is
deliberate for tokens, and arguably too aggressive for the rest.

## Options

- Document the four fields and point at `ctx.auth` for the provider. Cheapest, and
  admits the limitation.
- Let the app choose, e.g. `toPublicUser` working without `getUser`, so the no-database
  path can widen or narrow what gets signed. Fits the existing shape.
- Always include `provider` on the signed user, since it is not sensitive and is the
  field people reach for most after the four.

Related: `AuthProfile` also drops the granted `scopes` that antarctic returns, see the
note in `docs/tutorials/p. Github OAuth scopes and access tokens.md`.
