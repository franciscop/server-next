# Server JS [![@server/next](https://img.shields.io/npm/v/@server/next?label=@server/next&color=greenlime)](https://www.npmjs.com/package/@server/next) [![tests](https://github.com/franciscop/server-next/workflows/tests/badge.svg)](https://github.com/franciscop/server-next/actions)

A modern web server for Bun and Node, with routing, authentication, uploads, WebSockets and testing built in.

```bash
npm install @server/next
```

```js
import server from "@server/next";

export default server({ uploads: './uploads' })
  .get('/', () => 'Hello world')
  .get('/users/:id', (ctx) => db.users.find(ctx.url.params.id))
  .post('/avatar', (ctx) => ctx.body.avatar.path);
```

File storage comes included, so `uploads` takes a folder path or any bucket. Auth stores nothing of its own: two callbacks put the user wherever you already keep data.

```js
import server, { bucket } from "@server/next";
import { createClient } from "redis";

const redis = await createClient({ url }).connect();
const uploads = bucket.S3('my-bucket', { id, secret });

export default server({
  uploads,
  auth: {
    providers: ['github'],
    onLogin: async (profile) => {
      await redis.set(`user:${profile.id}`, JSON.stringify(profile));
      return profile.id;
    },
    getUser: async (id) => JSON.parse(await redis.get(`user:${id}`)),
  },
});
```

See the [full documentation](https://server-js.com/documentation).
