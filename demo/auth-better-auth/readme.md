# Better Auth

Email and password sign-in with [Better Auth](https://better-auth.com), mounted
on Server JS. Better Auth serves its own routes under `/api/auth/*` and its
session becomes `ctx.user`:

```js
const auth = betterAuth({ database, emailAndPassword: { enabled: true } });

export default server({ auth })
  .get('/me', (ctx) => ctx.user || 401);
```

Run it with `bun install && bun .`, then:

```sh
curl -c jar -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"a-long-password"}' \
  localhost:3000/api/auth/sign-up/email

curl -b jar localhost:3000/me
```

Users live in memory here, so they are gone on restart. Swap `memoryAdapter`
for one of Better Auth's database adapters to keep them. Set
`BETTER_AUTH_SECRET` to a long random string in production.
