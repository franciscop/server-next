# Google login persisted in SQLite

A cookie-only login is enough until you need to remember something about a person: a role, a plan, when they joined, what they own. None of that fits in a profile that came from Google, because none of it is Google's to know.

The moment you add a table, two questions appear. Where does the login write to it, and how does a request turn a cookie back into a row? Those are exactly the two callbacks.

This uses SQLite through Bun because it needs no server to run, but the shape is identical for Postgres or MySQL.

## 1. The two callbacks

```js
import server from '@server/next';
import { db } from './db.js';

const auth = {
  providers: 'google',

  onLogin: (profile) => {
    const user = db.users.upsertByEmail({
      id: crypto.randomUUID(),
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
    });
    return user.id;
  },

  getUser: (id) => db.users.find(id),
};

export default server({ auth })
  .get('/me', (ctx) => ctx.user ?? 401);
```

This assumes a `users` table of your own with a unique `email` and a `role` column, and the two functions above it. Neither is prescribed by the framework: there is no schema to inherit and no column that has to be named a certain way, because auth never touches your database itself.

```sh
SECRETS=a-long-random-string
GOOGLE_ID=...
GOOGLE_SECRET=...
```

**`onLogin` runs once**, right after Google confirms who somebody is. It receives the normalised profile and its job is to make sure a row exists, then return **the id that the cookie will carry**. Nothing else about what it returns is used.

**`getUser` runs on every request** that reads `ctx.user`. It receives that same id back and returns the person. Whatever it returns is `ctx.user`, untouched: no wrapping, no extra fields.

Between them, the cookie holds nothing but a signed id. That is what makes the role column work: because the row is read fresh each time, a change to it applies on the very next request rather than whenever someone next signs in.

Returning `undefined` from `getUser` is how you say "this credential is no longer good". Delete a row and that person is signed out everywhere at once, with no session store to clear.

## 2. Two details in that upsert

**It matches on `email`, not on Google's id.** Someone who later signs in through a different provider with the same address lands on the same account rather than getting a second, empty one. The cost is that you are trusting Google to have verified the address, which it does.

**It must leave `role` alone.** Update the name and avatar, which Google owns and may have changed, and never touch the columns you own. Miss that and promoting someone to admin lasts exactly until their next sign-in, which is a maddening bug to reproduce. In SQL that is an `ON CONFLICT (email) DO UPDATE` listing only the provider's fields.

## 3. Use the column

```js
  .get('/admin', (ctx) => {
    if (!ctx.user) return 401;
    if (ctx.user.role !== 'admin') return 403;
    return db.users.all();
  })
```

Two checks, because they mean different things: `401` says "I do not know who you are", `403` says "I do and you may not". Sending `403` to a signed-out visitor tells them a page exists that they cannot see, and sending `401` to a signed-in one usually makes the frontend bounce them through a pointless login.

Auth deliberately does none of this for you. It resolves who someone is and stops there, because whether a given route needs a role, a plan or a paid subscription is your product's business.

## 4. Refuse a login

Some people should not get an account at all. Throwing from `onLogin` stops the login before any row is written, and the message reaches your error page:

```js
  onLogin: (profile) => {
    if (!profile.email.endsWith('@company.com')) {
      throw new Error('Use your work account');
    }
    // ...the upsert
  },
```

The visitor is redirected to `redirect.error` with `?error=Use%20your%20work%20account`, so the page they land on can show them something better than a blank failure. Write the message for the person reading it, not for your logs.

## Next steps

- [Github login persisted in Redis](/tutorials/i-github-login-persisted-in-redis): the same two callbacks against a key-value store.
- [Revocable sessions in Postgres](/tutorials/j-revocable-sessions-in-postgres): one row per login rather than per person, so logout ends it everywhere.
