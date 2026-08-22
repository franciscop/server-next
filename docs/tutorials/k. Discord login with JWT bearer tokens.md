# Discord login with JWT bearer tokens

A cookie is the right default when your server renders the pages: the browser attaches it on every navigation and nothing in your frontend has to think about it.

That falls apart once the frontend is a separate app, or a phone. A React Native app has no cookie jar you control, and a single-page app on a different origin will not have your cookies sent for it. Those clients want to **hold the credential themselves** and attach it to each call, which is what the `jwt` strategy issues.

## 1. Switch the strategy

```js
import server from '@server/next';

const auth = {
  providers: 'discord',
  strategy: 'jwt',
  // Record whoever just signed in, and return the id the token will carry
  onLogin: (profile) => db.users.upsert({ email: profile.email, name: profile.name }).id,
  // Turn that id back into the person, once at login for a signed strategy
  getUser: (id) => db.users.find(id),
  toPublicUser: (user) => ({ id: user.id, name: user.name, role: user.role }),
  redirect: '/',
};

export default server({ auth })
  .get('/api/me', (ctx) => ctx.user ?? 401);
```

```sh
SECRETS=a-long-random-string
DISCORD_ID=...
DISCORD_SECRET=...
```

`jwt` signs the person **into** the token rather than putting an id in it, so later requests need no database lookup: the token is verified with your `SECRETS` and its contents become `ctx.user` directly.

That is why `toPublicUser` is required here and not for a session. Whatever it returns is inside a token the client holds and can read, so it is the boundary between what your database knows and what you are willing to publish. Returning the whole row would ship a password hash, an internal note or a billing field to every client. Return the few fields your frontend actually renders.

The trade for skipping the lookup is staleness: change someone's role and their existing token still says the old one until it expires.

## 2. Start the login from the client

```js
const res = await fetch('/auth/login/discord', {
  headers: { accept: 'application/json' },
});
const { url } = await res.json();
location.href = url;
```

The same route serves both kinds of caller. A browser navigating to it gets a `302` straight to Discord; a script sending `Accept: application/json` gets `{ url }` and decides for itself when to send the person there. That matters for a SPA, which wants to save draft state or show a spinner before handing the page over.

## 3. Collect the token

Discord sends the browser back to `/auth/callback/discord`, a route the framework mounts. It finishes the exchange, builds the token, and redirects to your `redirect` target with the token in the URL **fragment**:

```
https://example.com/#token=eyJhbGciOi...
```

The fragment is deliberate. Browsers never send the part after `#` to any server, so the token stays out of your access logs, out of `Referer` headers, and out of any proxy in between. A query string would leak it into all three.

```js
const params = new URLSearchParams(location.hash.slice(1));
if (params.get('token')) {
  localStorage.token = params.get('token');
  history.replaceState(null, '', location.pathname);
}
```

That `replaceState` tidies the token out of the address bar, so it does not end up in a screenshot, a bookmark or a shared link. Then every call carries it:

```js
fetch('/api/me', { headers: { authorization: `Bearer ${localStorage.token}` } });
```

Where you keep it is a real decision. `localStorage` is readable by any script on your page, so a cross-site scripting bug leaks the token; the usual answer is to keep it in memory instead and accept re-login on refresh. A cookie avoids that but reintroduces the cross-origin problem this setup exists to solve.

## 4. Native apps

Open the **system browser** at `/auth/login/discord` rather than fetching the URL from the app's own HTTP client.

The CSRF `state` is kept in a short-lived cookie, and it has to be in the jar of whatever finishes the login. Fetch that first request from the app's networking layer and the cookie lands there, so the browser arrives at the callback without it and the login fails with a `403`. Opening the system browser keeps both halves in the same place.

That is also what the platforms recommend (`ASWebAuthenticationSession` on iOS, Custom Tabs on Android), because it lets people reuse a Discord session they are already signed into, so this is not a workaround.

## 5. Revoking

A signed token cannot be taken back. Nothing is stored, so there is nothing to delete, and it stays valid until it expires. Keep that window short if it matters:

```js
const auth = { ...auth, expires: '1h' };   // alongside the callbacks above
```

If you need to end a session on demand, for a "sign out everywhere" button or after a security incident, use `session` or `token` instead, where the credential is an id you can delete. [Revocable sessions](/tutorials/j-revocable-sessions-in-postgres) covers that.

## 6. Serving a browser app and an API at once

Plenty of products are both: a server-rendered dashboard and a mobile client on the same database. Accept either credential, and the first named strategy is the one issued at login:

```js
const auth = { ...auth, strategy: ['session', 'jwt'] };
```

[`ctx.auth.strategy`](/documentation/context#ctxauth) then tells a handler how the current request authenticated, which is useful when a route should exist for the dashboard but not the public API.

## Next steps

- [Strategies in full](/documentation/authentication#strategies): what each of the four carries and what logout does to it.
- [Clerk auth in a same-origin cookie](/tutorials/m-clerk-auth-in-a-same-origin-cookie): when a vendor issues the token instead of you.
