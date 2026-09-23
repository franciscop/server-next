# Github OAuth scopes and access tokens

Signing in answers "who is this". A **scope** asks for something more: permission to act on their behalf afterwards, reading their repositories, listing their gists, opening a pull request.

The thing that carries that permission is the **access token**, handed over once when the login completes. If you do not keep it, the grant is wasted: the person approved a consent screen and you have nothing to spend it with.

## 1. Ask for the scope

```js
import server from "@server/next";

const SCOPES = ['repo', 'read:user'];

const auth = {
  providers: { github: { scope: SCOPES } },
  // Record whoever signed in, and return the id the cookie will carry
  onLogin: (profile) => db.users.upsert({ email: profile.email, name: profile.name }).id,
  // Turn that id back into the person, on every request
  getUser: (id) => db.users.find(id),
};

export default server({ auth });
```

```sh
SECRETS=a-long-random-string
GITHUB_ID=...
GITHUB_SECRET=...
```

This assumes a `users` table of your own, and a place to keep tokens: somewhere keyed by user id, holding the token and the scopes you asked for. Keeping those in their own table rather than a column on `users` is worth doing, so that an ordinary query for a person never drags a live credential along with it. [Google login persisted in SQLite](/tutorials/h-google-login-persisted-in-sqlite) covers the two callbacks on their own if they are new to you.

Scopes are configured per provider because they only mean anything to that provider: `repo` is a GitHub concept, and Google would not know what to do with it.

Ask for the narrowest set that works. People read the consent screen, and "wants to read and write all your repositories" costs you signups that "wants to read your profile" would not. You can always start narrow and request more later, which sends them through the flow again with the wider list.

## 2. Store the token

It arrives on the profile, once, at login. Nothing keeps it for you:

```js
  onLogin: (profile) => {
    const user = db.users.upsert({ email: profile.email, name: profile.name });
    db.tokens.save(user.id, {
      accessToken: encrypt(profile.accessToken),
      scopes: SCOPES,
    });
    return user.id;
  },
```

Overwrite it on every sign-in rather than only creating it once: the old token may have been revoked, and the new one reflects whatever they approved this time.

`encrypt` is yours, from your platform's KMS or AES-256-GCM with a key held outside the database.

**Encrypt it at rest.** This is a live credential for somebody else's GitHub account, with whatever powers the scopes granted. A leaked database dump containing plaintext access tokens is materially worse than one containing password hashes, because these need no cracking. Use your platform's KMS, or a symmetric key kept outside the database.

Some providers also return `profile.refreshToken`, for when the access token is short-lived. Store it the same way, and treat it as more sensitive still, since it mints new access tokens.

**Do not put the token on `ctx.user`.** Under the `cookie` and `jwt` strategies, whatever `ctx.user` holds is signed into the credential the client keeps, and a client can read its own credential. A token there is a token shipped to the browser on every request. Keep it in a table and read it only in the handlers that call the API.

## 3. Call the API

```js
export default server({ auth })
  .get('/repos', (ctx) => {
    if (!ctx.user) return 401;

    const stored = db.tokens.find(ctx.user.id);
    if (!stored) return 403;

    return fetch('https://api.github.com/user/repos', {
      headers: {
        authorization: `Bearer ${decrypt(stored.accessToken)}`,
        accept: 'application/vnd.github+json',
      },
    });
  });
```

Returning the `fetch` promise streams GitHub's response straight through to your client without buffering it.

The `403` covers a real case rather than being defensive: somebody who signed in before you added the scope has an account but no stored token. They need to go through the login again to grant it, and a clear error is what lets your frontend tell them so.

## 4. When they grant less than you asked

A consent screen is a negotiation. GitHub lets people approve fewer scopes than you requested, and other providers do the same.

The profile carries the access token, not the scopes it came with, so what you stored is what you asked for. Let the provider settle the difference: a call that needs `repo` and comes back `403` means the grant was narrower, and the fix is another trip through the login.

```js
  .get('/repos', async (ctx) => {
    if (!ctx.user) return 401;
    const stored = db.tokens.find(ctx.user.id);
    if (!stored) return 403;   // signed in before you asked for the scope
    // ...call the API, and treat its own 403 as "not granted"
  })
```

Hiding a button someone cannot use is a better experience than letting them press it, so keep the failure visible in your UI rather than silently swallowing it.

## 5. Provider-specific fields

The normalised profile carries what every provider has: `id`, `email`, `name`, `avatar`. Everything else that provider returned is in `profile.raw`, exactly as it arrived:

```js
  onLogin: (profile) => {
    const company = profile.raw.company;     // GitHub's own field
    const plan = profile.raw.plan?.name;
    // ...
  },
```

That is the escape hatch which keeps the normalised profile small: it does not need a field for every quirk of 63 providers, because the original is always there.

## Next steps

- [The profile](/documentation/authentication#the-profile): every field, and where `raw` comes from.
- [Revocable sessions in Postgres](/tutorials/j-revocable-sessions-in-postgres): ending a login you no longer trust.
