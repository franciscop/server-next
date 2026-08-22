# Github OAuth scopes and access tokens

Signing in answers "who is this". A **scope** asks for something more: permission to act on their behalf afterwards, reading their repositories, listing their gists, opening a pull request.

The thing that carries that permission is the **access token**, handed over once when the login completes. If you do not keep it, the grant is wasted: the person approved a consent screen and you have nothing to spend it with.

## 1. Ask for the scope

```js
import server from '@server/next';

const auth = {
  providers: { github: { scope: ['repo', 'read:user'] } },
  onLogin, getUser,
};
```

Scopes are configured per provider because they only mean anything to that provider: `repo` is a GitHub concept, and Google would not know what to do with it.

Ask for the narrowest set that works. People read the consent screen, and "wants to read and write all your repositories" costs you signups that "wants to read your profile" would not. You can always start narrow and request more later, which sends them through the flow again with the wider list.

## 2. Store the token

It arrives on the profile, once, at login. Nothing keeps it for you:

```js
const onLogin = async (profile) => {
  const user = await db.users.upsert({ email: profile.email, name: profile.name });
  await db.tokens.set(user.id, encrypt(profile.accessToken));
  return user.id;
};
```

**Encrypt it at rest.** This is a live credential for somebody else's GitHub account, with whatever powers the scopes granted. A leaked database dump containing plaintext access tokens is materially worse than one containing password hashes, because these need no cracking. Use your platform's KMS, or a symmetric key kept outside the database.

Some providers also return `profile.refreshToken`, for when the access token is short-lived. Store it the same way, and treat it as more sensitive still, since it mints new access tokens.

**Do not put the token on `ctx.user`.** Under the `cookie` and `jwt` strategies, whatever `ctx.user` holds is signed into the credential the client keeps, and a client can read its own credential. A token there is a token shipped to the browser on every request. Keep it in a table and read it only in the handlers that call the API.

## 3. Call the API

```js
  .get('/repos', async (ctx) => {
    if (!ctx.user) return 401;
    const token = decrypt(await db.tokens.get(ctx.user.id));
    if (!token) return 403;

    return fetch('https://api.github.com/user/repos', {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
      },
    });
  })
```

Returning the `fetch` promise streams GitHub's response straight through to your client without buffering it.

The `403` covers a real case rather than being defensive: somebody who signed in before you added the scope has an account but no stored token. They need to go through the login again to grant it, and a clear error is what lets your frontend tell them so.

## 4. Scopes people actually granted

A consent screen is a negotiation. GitHub lets people approve less than you asked for, and other providers do the same, so the granted set comes back with the token rather than matching your request:

```js
const onLogin = async (profile) => {
  const id = (await db.users.upsert({ email: profile.email })).id;
  await db.tokens.set(id, {
    token: encrypt(profile.accessToken),
    scopes: profile.scopes ?? [],
  });
  return id;
};
```

Check it before offering a feature. Hiding a button someone cannot use is a better experience than letting them press it and surfacing a `403` from GitHub that they can do nothing about.

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
