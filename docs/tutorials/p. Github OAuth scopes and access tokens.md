# Github OAuth scopes and access tokens

Signing in answers "who is this". A **scope** asks for something more: permission to act on their behalf afterwards, reading their repositories, listing their gists, opening a pull request.

The thing that carries that permission is the **access token**, handed over once when the login completes. If you do not keep it, the grant is wasted: the person approved a consent screen and you have nothing to spend it with.

## 1. Somewhere to put it

Two tables: the people, and the tokens they granted you. Keeping tokens in their own table is deliberate, so that a query for a user never drags a live credential along with it.

```js
// db.js
import { Database } from 'bun:sqlite';

export const db = new Database('./data.db');

db.run(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS tokens (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  scopes TEXT NOT NULL
)`);
```

## 2. Ask for the scope

```js
// index.js
import server from '@server/next';
import { db } from './db.js';

const auth = {
  providers: { github: { scope: ['repo', 'read:user'] } },

  onLogin: (profile) => {
    db.run(
      `INSERT INTO users (id, email, name) VALUES (?1, ?2, ?3)
       ON CONFLICT(email) DO UPDATE SET name = ?3`,
      [crypto.randomUUID(), profile.email, profile.name],
    );
    return db.query('SELECT id FROM users WHERE email = ?').get(profile.email).id;
  },

  getUser: (id) => db.query('SELECT * FROM users WHERE id = ?').get(id),
};

export default server({ auth });
```

`onLogin` runs once, when someone finishes signing in, and returns the id the cookie will carry. `getUser` turns that id back into the person on every later request, and whatever it returns is `ctx.user`. If those are new to you, [Google login persisted in SQLite](/tutorials/h-google-login-persisted-in-sqlite) covers them on their own.

Scopes are configured per provider because they only mean anything to that provider: `repo` is a GitHub concept, and Google would not know what to do with it.

Ask for the narrowest set that works. People read the consent screen, and "wants to read and write all your repositories" costs you signups that "wants to read your profile" would not. You can always start narrow and request more later, which sends them through the flow again with the wider list.

## 3. Store the token

It arrives on the profile, once, at login. Nothing keeps it for you:

```js
// crypto.js
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// A 32-byte key, from your secret manager rather than the database
const key = Buffer.from(process.env.TOKEN_KEY, 'base64');

export const encrypt = (text) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
};

export const decrypt = (stored) => {
  const raw = Buffer.from(stored, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([
    decipher.update(raw.subarray(28)),
    decipher.final(),
  ]).toString('utf8');
};
```

Then write the token as part of the same login:

```js
import { encrypt } from './crypto.js';

  onLogin: (profile) => {
    db.run(
      `INSERT INTO users (id, email, name) VALUES (?1, ?2, ?3)
       ON CONFLICT(email) DO UPDATE SET name = ?3`,
      [crypto.randomUUID(), profile.email, profile.name],
    );
    const { id } = db.query('SELECT id FROM users WHERE email = ?').get(profile.email);

    db.run(
      `INSERT INTO tokens (user_id, access_token, scopes) VALUES (?1, ?2, ?3)
       ON CONFLICT(user_id) DO UPDATE SET access_token = ?2, scopes = ?3`,
      [id, encrypt(profile.accessToken), (profile.scopes ?? []).join(' ')],
    );

    return id;
  },
```

The token is overwritten on every sign-in, which is what you want: the old one may have been revoked, and the new one reflects whatever they approved this time.

**Encrypt it at rest.** This is a live credential for somebody else's GitHub account, with whatever powers the scopes granted. A leaked database dump containing plaintext access tokens is materially worse than one containing password hashes, because these need no cracking. Use your platform's KMS, or a symmetric key kept outside the database.

Some providers also return `profile.refreshToken`, for when the access token is short-lived. Store it the same way, and treat it as more sensitive still, since it mints new access tokens.

**Do not put the token on `ctx.user`.** Under the `cookie` and `jwt` strategies, whatever `ctx.user` holds is signed into the credential the client keeps, and a client can read its own credential. A token there is a token shipped to the browser on every request. Keep it in a table and read it only in the handlers that call the API.

## 4. Call the API

```js
import { decrypt } from './crypto.js';

export default server({ auth })
  .get('/repos', (ctx) => {
    if (!ctx.user) return 401;

    const row = db
      .query('SELECT access_token FROM tokens WHERE user_id = ?')
      .get(ctx.user.id);
    if (!row) return 403;

    return fetch('https://api.github.com/user/repos', {
      headers: {
        authorization: `Bearer ${decrypt(row.access_token)}`,
        accept: 'application/vnd.github+json',
      },
    });
  });
```

Returning the `fetch` promise streams GitHub's response straight through to your client without buffering it.

The `403` covers a real case rather than being defensive: somebody who signed in before you added the scope has an account but no stored token. They need to go through the login again to grant it, and a clear error is what lets your frontend tell them so.

## 5. Scopes people actually granted

A consent screen is a negotiation. GitHub lets people approve less than you asked for, and other providers do the same, so the granted set comes back with the token rather than matching your request:

That is why the `scopes` column above stores `profile.scopes` rather than what you asked for. Read it back before offering a feature:

```js
  .get('/repos', (ctx) => {
    if (!ctx.user) return 401;
    const row = db
      .query('SELECT access_token, scopes FROM tokens WHERE user_id = ?')
      .get(ctx.user.id);

    if (!row?.scopes.split(' ').includes('repo')) return 403;
    // ...call the API
  })
```

Check it before offering a feature. Hiding a button someone cannot use is a better experience than letting them press it and surfacing a `403` from GitHub that they can do nothing about.

## 6. Provider-specific fields

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
