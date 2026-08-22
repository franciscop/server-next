# Revocable sessions in Postgres

With a user id in the cookie, "log out" is a lie. The route clears the cookie in the browser that asked, and that is all it can do: the cookie is a signed statement that says "this is user 42", and any copy of it made beforehand keeps saying so until it expires. There is nothing on the server to invalidate, because nothing was stored.

That is fine for a personal tool and unacceptable for anything with an account settings page. The fix is to make the cookie point at **a login** rather than at a person. Then it refers to a row, and a row can be deleted.

## 1. A row per login

Add a `sessions` table alongside your users: an id, the `user_id` it belongs to, and whatever you want to show people about it, typically the user agent, the IP and when it was created.

`user_agent` and `ip` are not required, but they are what turns this into a feature people can use: without them an account settings page can only offer "you have 3 sessions", which nobody can act on.

Point the foreign key at your users with `ON DELETE CASCADE`, so deleting someone takes their logins with them and a deleted account cannot leave a working credential behind.

## 2. Point the credential at it

```js
const auth = {
  providers: 'github',

  onLogin: async (profile, ctx) => {
    const user = await db.users.upsertByEmail(profile);
    const session = await db.sessions.create({
      userId: user.id,
      userAgent: ctx.headers['user-agent'],
      ip: ctx.ip,
    });
    return session.id;                  // the cookie points at the login
  },

  // One query: the session row, joined to the person it belongs to
  getUser: (id) => db.sessions.findUser(id),

  onLogout: (id) => db.sessions.delete(id),
};
```

The callbacks are the same two as any other setup, pointed one table further out. `onLogin` still returns "the id the cookie will carry", it is just a session id now. `getUser` still turns that id into a person, it just joins to get there.

`ctx` is the second argument to `onLogin` for exactly this: the request that is signing in is the only place the user agent and IP exist.

**`onLogout` is what makes the difference.** `POST /auth/logout` now deletes the row, so the credential stops working everywhere at once rather than only in the browser that asked. Without it the cookie is still cleared locally, and you are back to the situation this tutorial exists to fix.

The cost is one join per request. That is the price of being able to revoke, and it is the same query shape the session store in any other framework runs.

## 3. Their devices, in account settings

The session id is what `getUser` receives, so listing someone's logins is an ordinary query:

```js
  .get('/account/sessions', (ctx) => {
    if (!ctx.user) return 401;
    return db.sessions.forUser(ctx.user.id);
  })

  .del('/account/sessions/:id', async (ctx) => {
    if (!ctx.user) return 401;
    // Scoped by user, so an id that is not theirs matches nothing
    await db.sessions.deleteOwned(ctx.url.params.id, ctx.user.id);
    return 204;
  })
```

That the delete is scoped by user is doing real work. Without it, anyone signed in could pass someone else's session id and sign them out. Matching on both means an id that is not theirs affects nothing, and they cannot tell whether it existed.

To mark which row is the current device, compare against [`ctx.auth.issuedAt`](/documentation/context#ctxauth), which is when this particular credential was minted.

## 4. Sign out everywhere

```js
  .post('/account/sign-out-everywhere', async (ctx) => {
    if (!ctx.user) return 401;
    await db.sessions.deleteForUser(ctx.user.id);
    return 204;
  })
```

Worth wiring into a password change, an email change, or a "I think someone has my account" button. Those are the moments when the whole point is ending a session you no longer control, and this is the only version of logout that actually does it.

## 5. Clean up

Rows outlive the cookies pointing at them, so the table grows forever unless you prune it:

Delete anything older than the credential's own lifetime, on a schedule. The credential itself expires after [`expires`](/documentation/authentication#expires), 30 days by default, so anything older than that window can never be presented again and is pure dead weight. Keep the two numbers in step, or you will either delete live sessions or keep useless ones.

## Next steps

- [Github login persisted in Redis](/tutorials/i-github-login-persisted-in-redis): the same idea with a TTL instead of a cleanup job.
- [Discord login with JWT bearer tokens](/tutorials/k-discord-login-with-jwt-bearer-tokens): the opposite trade, where nothing is stored and nothing can be revoked.
