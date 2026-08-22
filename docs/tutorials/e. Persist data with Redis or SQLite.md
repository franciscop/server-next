# Persist data with Redis or SQLite

The [REST API tutorial](/tutorials/a-build-a-rest-api-with-javascript) kept notes in a `Map`, so they vanish on restart. Swap it for a store built with [polystore](https://polystore.dev/) and the same code persists to Redis, the filesystem, DynamoDB, and more.

## 1. From Map to store

Install [polystore](https://polystore.dev/) (`npm install polystore`) and back it with a `Map` in development:

```js
import server, { status } from '@server/next';
import kv from 'polystore';

const notes = kv(new Map());

export default server()
  .get('/notes', async () => {
    const ids = await notes.keys();
    return Promise.all(ids.map((id) => notes.get(id)));
  })
  .post('/notes', async (ctx) => {
    const id = crypto.randomUUID();
    const note = { id, text: ctx.body.text };
    await notes.set(id, note);
    return status(201).json(note);
  })
  .get('/notes/:id', (ctx) => notes.get(ctx.url.params.id))
  .delete('/notes/:id', async (ctx) => {
    await notes.del(ctx.url.params.id);
    return 204;
  });
```

Every store call is async, so `await` them.

## 2. Redis in production

Point the same `kv()` at Redis and nothing else changes:

```js
import kv from 'polystore';
import { createClient } from 'redis';

const notes = kv(createClient({ url: process.env.REDIS_URL }));
```

## 3. One Redis for the whole app

Prefixes carve one backend into independent stores, so different parts of your app can share a single Redis without colliding:

```js
const redis = kv(createClient({ url: process.env.REDIS_URL }));
const notes = redis.prefix('note:');
const users = redis.prefix('user:');

export default server({
  auth: {
    providers: 'github',
    onLogin: async (profile) => {
      await users.set(profile.email, { email: profile.email, name: profile.name });
      return profile.email;
    },
    getUser: (id) => users.get(id),
  },
});
// notes and the signed-in users now persist across restarts
```

[Auth](/documentation/authentication) takes no store of its own: `onLogin` and `getUser` are the only places it touches your data, so it uses whatever you already have.

## Next steps

- Expire temporary data automatically: `notes.set(key, value, { expires: '1h' })`.
