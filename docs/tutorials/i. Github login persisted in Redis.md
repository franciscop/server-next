# Github login persisted in Redis

The two callbacks say nothing about SQL. They are "store this person" and "fetch them back", so a key-value store works exactly as well as a table, and often better: a login is a read of one record by one id, which is what Redis is for.

This is worth choosing when you already run Redis, when your users should expire on their own, or when you want the login path to stay fast under load without touching your main database.

## 1. The store

[polystore](https://polystore.dev/) puts one small interface over Redis, a `Map`, DynamoDB and others, so the code below runs unchanged against any of them.

```bash
npm install polystore redis
```

```js
// db.js
import kv from 'polystore';
import { createClient } from 'redis';

const redis = kv(createClient({ url: process.env.REDIS_URL }));

export const users = redis.prefix('user:');
export const byEmail = redis.prefix('email:');
```

Prefixes carve one Redis instance into independent namespaces. `users.get('abc')` reads the key `user:abc`, so this can share a server with your cache and your queues without any chance of a collision.

Swapping `createClient(...)` for `new Map()` gives you an in-memory version for tests, with no other change.

## 2. Two keys, because there are no indexes

A relational database can find a row by email through an index. Redis cannot: it looks things up by key and nothing else. So the email gets its own key pointing at the id, and the id points at the record.

```js
import server from '@server/next';
import { users, byEmail } from './db.js';

const auth = {
  providers: 'github',

  onLogin: async (profile) => {
    const id = (await byEmail.get(profile.email)) ?? crypto.randomUUID();
    await byEmail.set(profile.email, id);
    await users.set(id, {
      // Anything already stored wins, so a role set in your admin panel
      // survives the next sign-in
      ...(await users.get(id)),
      id,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
    });
    return id;
  },

  getUser: (id) => users.get(id),
};

export default server({ auth })
  .get('/me', (ctx) => ctx.user ?? 401);
```

The `byEmail` lookup is what makes a returning person land on their existing record instead of a fresh one. First sign-in: no key, so a new id is generated. Every time after: the key is there, the same id comes back, and the record is updated in place.

Spreading the stored record **first** is the equivalent of a careful `ON CONFLICT`. The fields Github owns are overwritten, and anything you added yourself is preserved. Put the spread last and every sign-in quietly wipes your own columns.

`getUser` needs no wrapper: polystore returns `null` for a missing key, and auth treats that the same as `undefined`, so a deleted record signs that person out on their next request.

## 3. Expiring people

Records live forever by default. Giving them a lifetime turns inactive accounts into garbage collection you never have to run, since every sign-in rewrites the key and resets the clock:

```js
export const users = redis.prefix('user:').expires('90d');
```

Think about this one before enabling it. It deletes **accounts**, not sessions. If a role, a plan or anything else you cannot reconstruct lives on that record, an expiry silently destroys it for someone who took a long holiday. It suits a store of cached profile data, and suits an actual user table much less.

Note the two keys expire independently, so give `byEmail` the same lifetime or you will end up with an email pointing at an id that no longer exists. `getUser` returning `null` handles that safely, but the person gets a brand new empty account.

## 4. Roles

Nothing changes from the SQL version, because `ctx.user` is whatever you stored:

```js
  .get('/admin', (ctx) => {
    if (!ctx.user) return 401;
    if (ctx.user.role !== 'admin') return 403;
    return 'welcome';
  })
```

Granting one is a plain write:

```js
await users.set(id, { ...(await users.get(id)), role: 'admin' });
```

Because `getUser` reads the record on every request, that takes effect immediately, without the person signing out and back in.

## Next steps

- [Google login persisted in SQLite](/tutorials/h-google-login-persisted-in-sqlite): the same shape in SQL, with an upsert instead of two keys.
- [Revocable sessions in Postgres](/tutorials/j-revocable-sessions-in-postgres): when logging out has to end the session everywhere.
