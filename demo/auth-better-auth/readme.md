# Better Auth (not runnable yet)

What using [Better Auth](https://better-auth.com) would look like if `auth`
accepted a third-party auth system:

```js
const auth = betterAuth({ database, emailAndPassword: { enabled: true } });

export default server({ auth })
  .get('/me', (ctx) => ctx.user || 401);
```

It would own the whole lifecycle: routes under `/api/auth/*`, session cookies,
storage, 2FA, passkeys, organizations and account linking. The framework would
mount its handler and resolve `ctx.user` from its session, WebSocket
handshakes included.

The framework has **no such mode today**. It was prototyped end to end against
the real library (it works, in about 50 lines) and then reverted while the
design settled. See `ideas/auth-docs.md` for the shape it landed on.
