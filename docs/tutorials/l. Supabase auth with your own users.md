# Supabase auth with your own users

Supabase Auth owns the sign-in: their client library shows the form, talks to their servers, and ends up holding a signed token for the person using your app. Your server never runs a login flow and never sees a password. Its only job is to decide, on every request, whether the token that arrived is genuine and whose it is.

This is the opposite arrangement to [signing in with GitHub](/tutorials/b-sign-in-with-github-using-oauth), where the framework mounts routes and issues its own cookie. Here it mounts nothing.

## 1. Verify the token

```js
import server from '@server/next';

export default server({ auth: 'jwt:supabase' })
  .get('/api/me', (ctx) => ctx.user ?? 401);
```

```sh
SUPABASE_ISSUER=https://xyzcompany.supabase.co/auth/v1
SUPABASE_AUDIENCE=authenticated
```

Supabase signs its tokens with a private key and publishes the matching public keys at a well-known URL. On the first request that carries a token, the framework fetches those keys and caches them by key id, so verification after that is local arithmetic with no network call. If Supabase rotates a key, an unrecognised key id triggers one refetch rather than a restart.

Nothing here needs a client secret, because verifying a signature only needs the public half. That is also why this shape mounts no routes: there is no code to exchange and no redirect to handle.

`SUPABASE_AUDIENCE` is the literal string `authenticated`. It is the Postgres role Supabase writes into the token, the same for every project on the platform, so do not go hunting for it in your dashboard.

## 2. Send it from the browser

Your frontend already has a Supabase client, and after someone signs in it holds their **session**: an access token, a refresh token, and an expiry. The access token is the part your server wants.

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function api(path) {
  // Reads the stored session, and silently refreshes it if it has expired
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;            // nobody is signed in

  return fetch(path, {
    headers: { authorization: `Bearer ${data.session.access_token}` },
  });
}
```

Three things worth knowing about that call.

**`getSession()` reads from local storage, it does not hit the network** in the normal case, so calling it before each request is cheap. It does refresh the token when it has expired, which is why you should call it per request rather than grabbing the token once at startup and holding it. Supabase access tokens last an hour by default; a cached one will start failing with `401` mid-session.

**It returns `null` when nobody is signed in.** That is not an error, it is the signed-out state, and it is worth handling explicitly rather than sending `Bearer undefined` and getting a confusing `401` back.

**The token goes in a header, not a cookie.** Supabase keeps the session in `localStorage` by default, which the browser will not attach to requests for you. That is the trade of this setup: you attach it yourself everywhere, and in exchange nothing is sent automatically, so cross-site request forgery is not a concern for these endpoints.

## 3. Claims are not a user row

At this point `ctx.user` is the decoded token payload. Supabase puts a useful amount in it:

```js
{
  sub: '9f2b...',          // their user id
  email: 'ada@x.com',
  role: 'authenticated',
  app_metadata: { provider: 'github' },
  user_metadata: { full_name: 'Ada' },
}
```

That is enough for a check that only needs a flag on the token:

```js
  .get('/admin', (ctx) => {
    if (!ctx.user) return 401;
    if (ctx.user.app_metadata?.role !== 'admin') return 403;
    return db.reports.all();
  })
```

Note **which** metadata that reads. `app_metadata` can only be written with the service key, from your backend, so it is safe to make decisions on. `user_metadata` is editable by the account owner through the client library, so treating it as a permission would let anyone grant themselves whatever it says.

The limit of claims shows up as soon as you own data. A token tells you Supabase's id for someone, but your `files` table has a `user_id` column pointing at your own users, and there is nothing in the token to compare it against.

## 4. Map to your own table

`getUser` bridges that gap. It means the same thing here as in every other setup: turn an id into a person. The id it receives is the `sub` claim, which is Supabase's user id, and whatever you return becomes `ctx.user`.

```js
const auth = {
  issuer: process.env.SUPABASE_ISSUER,
  audience: 'authenticated',
  // `id` is the `sub` claim: Supabase's id for that person
  getUser: (id) => db.users.bySupabaseId(id),
};

export default server({ auth })
  .get('/files/:id', async (ctx) => {
    if (!ctx.user) return 401;
    const file = await db.files.find(ctx.url.params.id);
    if (!file) return 404;
    if (file.userId !== ctx.user.id) return 403;
    return file;
  });
```

The handler now reads exactly as it would if you had built the login yourself, which is the point: the rest of your app should not be able to tell which auth setup you chose.

You need a row to find, so create one the first time you see a `sub` you do not recognise. Supabase can also call a [database webhook](https://supabase.com/docs/guides/database/webhooks) on insert into `auth.users`, which keeps the two in step without a check on every request.

Bear in mind this costs a query per request, since it runs whenever a handler reads `ctx.user`. Cache it if that matters, or keep using the claims on the routes that only need an id.

## 5. Why the audience is required

One Supabase project serves your web app, your mobile app and anything else you build on it, and every one of those tokens is signed with the same key and carries the same issuer. If you checked only the signature, a token minted for a different application would sail through: it is genuinely signed and genuinely from that issuer, just not for you.

The audience is the only claim that separates them, which is why it has no default and the app refuses to start without it. On Supabase specifically every token says `authenticated`, so the check is weaker than on a platform like Auth0 where each API has its own identifier. It still stops a token from another *project* being accepted, since that would fail on the issuer.

## Next steps

- [Firebase auth from a mobile app](/tutorials/n-firebase-auth-from-a-mobile-app): the same shape, different claims and a different id.
- [Checking a token minted elsewhere](/documentation/authentication#checking-a-token-minted-elsewhere): the reference for any issuer.
