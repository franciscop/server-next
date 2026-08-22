# Auth documentation (draft)

Drafting the docs for the auth API we want to support. Written as if the code
already exists, so the shape can be judged the way a reader would meet it.

## API

`auth` takes one of five things, and all of them end the same way: a plain,
typed `ctx.user` in every handler.

```js
const auth = 'cookie:github';                      // a login flow, no database
const auth = { providers: 'github', ... };         // a login flow, your database
const auth = { verify: ISSUER, audience: 'api' };  // check a token minted elsewhere
const auth = (ctx) => db.users.find(...);          // check anything else, your way
const auth = betterAuth({ database });             // a library that does it all

export default server({ auth });
```

Or an array of them, tried in order.

### `ctx.user`

A plain field, not a method, holding whatever your configuration produces. It
resolves once per request, the first time a handler reads it, so routes that
never touch it pay nothing.

```js
export default server({ auth })
  .get('/me', (ctx) => ctx.user);
```

With no `auth` configured, `ctx.user` is typed `undefined`, so reading a
property off it is a compile error rather than a runtime surprise. Otherwise it
is typed from your own callbacks, and you never declare a `User` type.

Being signed out is `ctx.user` being `undefined`. There is no
`isAuthenticated()`.

Alongside it, `ctx.auth` describes the credential rather than the person:

```ts
ctx.auth   // { issuedAt: Date, expiresAt: Date, strategy: 'session' }
```

Useful for showing "signed in since", or asking someone to re-authenticate
before a destructive action. When the credential was minted elsewhere,
`ctx.auth.claims` holds the token's full payload.

### Logging in with no database

The shortest thing that works. No table, no callbacks, nothing to run:

```js
export default server({ auth: 'cookie:github' })
  .get('/me', (ctx) => ctx.user);      // { provider, id, email, name, avatar }
```

The profile is signed into the cookie, so `ctx.user` is available on every
later request with nothing behind it. The same thing written out, when you want
to set other options:

```js
const auth = { providers: 'github', strategy: 'cookie', redirect: '/app' };

export default server({ auth });
```

Omitting the callbacks is what makes it database-free, and it is all or
nothing: as soon as you write `onLogin` you are storing people somewhere and
`getUser` is required too. Without a database the strategy must be `'cookie'`
or `'jwt'`, since there is nowhere to look an id up.

What you give up: nothing about a person can change until they log in again,
there is no role column to check, and logging out only clears the cookie on the
device that asked for it.

### A login flow with your database

The framework runs the handshake and issues the credential; you decide who gets
stored and where.

```js
const auth = {
  providers: 'github',
  onLogin: async (profile) => (await db.users.upsert({ email: profile.email, ...profile })).id,
  getUser: (id) => db.users.find(id),
};

export default server({ auth });
```

| Key | Type | Required, or default |
| --- | --- | --- |
| `providers` | `string`, `string[]` or an object | required |
| `strategy` | `'session' \| 'cookie' \| 'token' \| 'jwt'`, or an array | `'session'` |
| `expires` | duration | `'30d'` |
| `rolling` | `boolean` | `true` |
| `onLogin` | `(profile, ctx) => id` | with `getUser` |
| `getUser` | `(id, ctx) => user` | always under `'session'` and `'token'`; with `onLogin` otherwise |
| `toPublicUser` | `(user) => publicUser` | with `getUser`, under `'cookie'` and `'jwt'` |
| `onLogout` | `(id, ctx) => void` | none |
| `redirect` | string, function, or an object of the three | `'/'` |

#### How a login works

Worth reading once, because it explains why the callbacks are shaped the way
they are:

1. The handshake finishes and produces a normalised **profile**.
2. `onLogin(profile, ctx)` stores whoever that is and returns an **id**: the
   thing the credential will point at.
3. Under `'session'` and `'token'` that id goes straight into the credential.
   Under `'cookie'` and `'jwt'` the framework calls `getUser(id)` and then
   `toPublicUser(user)`, and signs the result into the credential instead.
4. On later requests, `'session'` and `'token'` call `getUser(id, ctx)`, while
   `'cookie'` and `'jwt'` just read what was signed.

Each callback means exactly one thing in all four strategies: `onLogin`
identifies, `getUser` resolves, `toPublicUser` trims. Changing `strategy` never
changes what your callbacks do, only how often they run.

The callbacks are all or nothing, and the group can only be dropped under
`'cookie'` and `'jwt'`: with no database there is nothing for `getUser` to read,
so the profile is signed as-is. Under `'session'` and `'token'` the credential
holds an id and something has to resolve it, so both are required.

#### `providers`

Three spellings, from shortest to most explicit:

```js
providers: 'github',
providers: ['github', 'google'],
providers: { github: {}, google: {} },
```

The object form is the one that takes settings, and a bare string value is
shorthand for `{ issuer: ... }`:

```js
providers: {
  github: { scope: ['repo'] },
  google: {},
  work: 'https://keycloak.company.com/realms/main',
  staff: { issuer: 'https://auth.example.com/realms/staff', scope: 'openid email profile groups' },
},
```

| Key | Meaning | Default |
| --- | --- | --- |
| `id` | OAuth client id | `<NAME>_ID` from the environment |
| `secret` | OAuth client secret | `<NAME>_SECRET` from the environment |
| `scope` | string or array of strings | the provider's own, or `openid email profile` |
| `issuer` | OIDC issuer URL, which makes this a generic provider | none |
| anything else | passed through to the authorize URL | |

Passthrough is how `prompt: 'consent'`, `team: 'T012345'` and `tenant` work
without the framework knowing they exist.

##### The name is yours

The key drives three things at once: the route (`/auth/login/work`), the
environment variables (`WORK_ID`, `WORK_SECRET`), and `profile.provider`, which
is what `onLogin` branches and links on.

So two issuers is just two names:

```js
providers: {
  staff: 'https://auth.example.com/realms/employees',       // STAFF_ID, STAFF_SECRET
  customers: 'https://auth.example.com/realms/customers',   // CUSTOMERS_ID, CUSTOMERS_SECRET
},
```

##### Any OIDC provider, with no code

Shipped names are `apple`, `discord`, `facebook`, `github`, `google` and
`microsoft`. Anything else needs an `issuer`, and then works without a file
anywhere: Keycloak, Okta, Entra, Zitadel, Authentik, Auth0 and most corporate
single sign-on.

| Name | `issuer` | Result |
| --- | --- | --- |
| known | absent | the shipped provider |
| known | present | the issuer wins |
| unknown | present | discovery does the rest |
| unknown | absent | boot error, naming the provider |

An issuer publishes everything needed at
`<issuer>/.well-known/openid-configuration`: where to redirect, where to
exchange the code, and the identity claims that become the profile. Claims that
are not part of the standard set, like group memberships or a namespaced role,
arrive in `profile.raw`.

#### `strategy`

Where the credential rides, and what it contains:

| `strategy` | Carried in | Holds | Per request | What logout invalidates |
| --- | --- | --- | --- | --- |
| `'session'` | a cookie | an opaque id | `getUser(id)` | whatever `onLogout` deletes |
| `'cookie'` | a cookie | signed user data | nothing | this browser only |
| `'token'` | `Authorization` | an opaque id | `getUser(id)` | whatever `onLogout` deletes |
| `'jwt'` | `Authorization` | signed user data | nothing | nothing, the client drops it |

A shorter way to hold it:

- `'session'`: browser, and the server remembers
- `'cookie'`: browser, and the server forgets
- `'token'`: API client, and the server remembers
- `'jwt'`: API client, and the server forgets

"Session" here means a server-side session referenced by a cookie, not the
browser's own notion of a cookie that dies when the window closes; ours lives
as long as `expires`.

The two "remembers" strategies put an opaque id in the credential and look it
up through `getUser` on every request, so anything you change lands
immediately. The two "forgets" strategies sign the user into the credential
once, so there is nothing to look up and nothing to revoke.

One app can serve both:

```js
const auth = {
  providers: 'github',
  strategy: ['session', 'jwt'],     // accept either, issue the first on login
  onLogin,
  getUser,
  toPublicUser,
};
```

#### `expires` and `rolling`

```js
expires: '30d',
rolling: true,
```

With `rolling` on, the credential is refreshed on use, so `expires` measures
inactivity rather than time since login. It applies to the cookie strategies,
where the response can carry a new cookie. Under `'token'` and `'jwt'` the
client holds the credential and cannot be handed a new one mid-request, so
those need a refresh endpoint for the same effect.

#### `onLogin`

Runs once, after a successful handshake. Receives the normalised profile and
the pre-login request, and returns **the id the credential should point at**.

```js
onLogin: async (profile, ctx) => {
  if (!profile.emailVerified) throw new Error('Verify your email with GitHub first');
  const existing = await db.users.find({ email: profile.email });
  if (existing?.banned) throw new Error('Your account is suspended');
  await db.carts.move(ctx.cookies.cart, existing?.id);    // merge anonymous state
  const user = await db.users.upsert(
    { email: profile.email },
    { [`${profile.provider}Id`]: profile.id, name: profile.name },
  );
  return user.id;
},
```

Refuse a login by throwing. The message reaches `redirect.error` as `?error=`,
so write it for the person reading it, not for a log file.

Refusing is never "return nothing": a missing `return` is `undefined` in
JavaScript, so treating that as a denial would turn an ordinary bug into people
being rejected for no stated reason. `onLogin` must return an id.

The `emailVerified` check matters. Upserting on email without it means anyone
who can register your address at the least careful of your providers inherits
your account.

Account linking is this function's `WHERE` clause: `profile.provider` tells you
which one you are being handed, so whether two providers collapse into one row
is your decision, not a framework setting.

##### What the id points at

The framework has no opinion about what the id identifies, and that is where
the flexibility lives. Return a user id and the credential points at a person.
Return a session id and it points at one login.

```js
// One login per person. No session table. Logging out clears this device's
// cookie; a copy taken beforehand keeps working until it expires.
onLogin: async (profile) => (await db.users.upsert({ email: profile.email, ...profile })).id,
getUser: (id) => db.users.find(id),

// One row per login. Logout means something, and people can see and end their
// own sessions.
onLogin: async (profile, ctx) => {
  const user = await db.users.upsert({ email: profile.email, ...profile });
  const session = await db.sessions.create({
    userId: user.id,
    userAgent: ctx.headers['user-agent'],
  });
  return session.id;
},
getUser: (id) => db.sessions.findUser(id),      // joins back through userId
onLogout: (id) => db.sessions.delete(id),
```

Same callbacks, pointed at a different table. The link between the cookie and
the person is the `userId` column on your own sessions row.

##### The profile

Normalised across providers, so adding one is not a code change:

```ts
{
  provider: 'github',
  id: '583231',
  email, emailVerified, name, avatar,
  accessToken, refreshToken?,
  raw,                        // the untouched response, for provider-specific fields
}
```

#### `getUser`

Turns the id from `onLogin` into the user. Under `'session'` and `'token'` it
runs on every request that reads `ctx.user`; under `'cookie'` and `'jwt'` it
runs once at login, feeding `toPublicUser`.

```js
getUser: (id, ctx) => db.users.find(id),
```

It is named for what it returns, which is always the user; what it receives is
whatever `onLogin` identified. Return `undefined` for "no such user", which
signs that credential out.

Under the two "remembers" strategies, running per request is what keeps things
honest: change a role and it applies on the next request, return `undefined`
and that person is signed out everywhere at once. The cost is one lookup per
request, which is yours to cache.

That is control over the *user*, not over one credential. Invalidating a single
leaked cookie while leaving that person's other devices alone needs the
credential to be something you can point at and delete, which is the session
shape above.

`ctx.auth` is available here, which is what makes "sign me out everywhere"
possible without a sessions table:

```js
getUser: async (id, ctx) => {
  const user = await db.users.find(id);
  if (!user || ctx.auth.issuedAt < user.sessionsValidAfter) return;
  return user;
},
```

#### `toPublicUser`

Runs once, at login, for `'cookie'` and `'jwt'`. Takes what `getUser` returned
and produces what gets signed into the credential, which is both what
`ctx.user` will be on later requests and what the client can read.

```js
const auth = {
  providers: 'github',
  strategy: 'cookie',
  onLogin: async (profile) => (await db.users.upsert({ email: profile.email, ...profile })).id,
  getUser: (id) => db.users.find(id),
  toPublicUser: (user) => ({ id: user.id, email: user.email, role: user.role }),
};

export default server({ auth });
```

Your row goes in, the public subset comes out, and no database is touched on
later requests. It is required rather than defaulted, because defaulting it to
"sign the whole row" quietly publishes whatever else is on it.

#### `onLogout`

Runs when someone hits `POST /auth/logout`, with the same id `getUser`
receives. The credential is cleared either way; this is for anything of yours
that should go with it.

```js
onLogout: (id) => db.sessions.delete(id),                                  // that device
onLogout: (id) => db.users.update(id, { sessionsValidAfter: new Date() }), // all of them
```

Omit it and logging out is local: the browser forgets the credential, and a
copy taken beforehand keeps working until it expires. For a small app that is
often the right trade, but it should be a decision rather than a surprise.

#### `redirect`

```js
redirect: '/app',
redirect: (user, ctx) => ctx.url.query.next ?? (user.role === 'admin' ? '/admin' : '/app'),
redirect: {
  login: '/app',
  logout: '/',
  error: '/login?failed',
},
```

A bare string or function sets `login` only. Each slot takes either. The
function form covers sending people back where they came from, which a static
value cannot.

#### Mounted routes

| Route | Does |
| --- | --- |
| `GET /auth/login/:provider` | starts the handshake |
| `GET /auth/callback/:provider` | finishes it, calls `onLogin`, issues the credential |
| `POST /auth/logout` | calls `onLogout`, clears the credential |

So "log in with GitHub" is a link to `/auth/login/github`. CSRF `state` is
handled for you.

The shape of those responses follows from `strategy`, with nothing to
configure. Under `'session'` and `'cookie'` the browser is doing the whole
thing, so `/auth/login/github` redirects to the provider and the callback sets
a cookie and redirects to `redirect.login`.

Under `'token'` and `'jwt'` the client is holding the credential, so
`/auth/login/github` answers with the URL instead of redirecting to it:

```json
{ "url": "https://github.com/login/oauth/authorize?client_id=..." }
```

The client sends the person there itself. The callback is still hit by the
**browser**, because that is where the provider sends them back, so it also
redirects to `redirect.login`, carrying the credential in the URL fragment:

```
https://example.com/app#token=eyJhbGciOi...
```

A fragment rather than a query string, because browsers never send it to a
server, so it stays out of access logs and referrer headers. The client reads
it on load and stores it wherever it keeps credentials.

#### Environment

```sh
SECRET=...              # signs the credential, required in production
GITHUB_ID=...
GITHUB_SECRET=...
```

### Checking a token minted elsewhere

When the login happened somewhere else, there is no handshake to run and no
routes to mount. Their SDK signed the person in, and every request arrives
carrying a token:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImE0MiJ9...
```

Point at the issuer and say who the token should be for:

```js
const auth = { verify: 'https://xyz.supabase.co/auth/v1', audience: 'authenticated' };

export default server({ auth })
  .get('/me', (ctx) => ctx.user);      // the token's claims
```

That covers most hosted auth, because they all publish their keys the same way:

| Issuer | `verify` | `audience` |
| --- | --- | --- |
| Supabase | `https://<ref>.supabase.co/auth/v1` | `authenticated` |
| Auth0 | `https://<tenant>.auth0.com/` | your API identifier |
| Cognito | `https://cognito-idp.<region>.amazonaws.com/<pool>` | the app client id |
| Clerk | `https://<slug>.clerk.accounts.dev` | your frontend API |
| Keycloak | `https://<host>/realms/<realm>` | the client id |
| Google | `https://accounts.google.com` | your OAuth client id |

| Key | Type | Required, or default |
| --- | --- | --- |
| `verify` | issuer URL | required |
| `audience` | string or array of strings | required |
| `getUser` | `(id, ctx) => user` | none |

#### What gets checked

The issuer's discovery document at
`<verify>/.well-known/openid-configuration` gives the key set, which is fetched
once and cached by key id. Every request then checks four things: the
signature, that `iss` matches your issuer, that `aud` matches your audience,
and that the token has not expired.

`audience` is required and has no default, which is deliberate. One issuer
usually serves several applications, all signed with the same keys, so a token
minted for a different app carries a valid signature and the same `iss`. The
audience is the only claim that separates them, and skipping it means anyone
who can get a token from that issuer can call your API.

A request with **no** token is anonymous: `ctx.user` is `undefined` and your
handlers decide whether that deserves a 401. A request with a **broken** token
is a 401 with `WWW-Authenticate`, since silently treating an expired token as
"not logged in" sends clients hunting for a bug in the wrong place.

#### Your own user record

Without `getUser`, `ctx.user` is the claims: `sub`, `email`, and whatever else
that issuer includes. Claims are not a user row, so there is no role column and
no id of yours to compare against.

Add `getUser` and it means the same thing it means everywhere else, turning an
id into a user. The id here is the `sub` claim:

```js
const auth = {
  verify: 'https://xyz.supabase.co/auth/v1',
  audience: 'authenticated',
  getUser: (id, ctx) => db.users.byExternalId(id),   // ctx.auth.claims has the rest
};
```

Now `ctx.user` is your row, so ownership checks compare `file.userId` against
`ctx.user.id` exactly as they do under a login flow, and the rest of your app
cannot tell which family of auth you configured.

#### Anything else

A function handles credentials that are not JWTs, or checks you want to write
yourself:

```js
const auth = (ctx) => db.users.byApiKey(ctx.headers['x-api-key']);
```

`ctx.user` is typed as whatever it returns, and it runs at most once per
request. Return `undefined` for "not logged in", which is not an error:
handlers decide whether that deserves a 401. To fail the request instead, throw
an error carrying a `status`:

```js
throw new ServerError('AUTH_EXPIRED_TOKEN', 401, 'Your session expired');
```

Anything else thrown is a 500.

### A library that does it all

Some libraries run their own handshake and serve their own routes. Pass the
instance:

```js
const auth = betterAuth({ database, socialProviders: { github } });

export default server({ auth });
```

Its whole route prefix is mounted and `ctx.user` comes from its session. The
prefix is the library's own, so moving it is a setting there, not here:

```js
const auth = betterAuth({ database, socialProviders: { github }, basePath: '/account' });

export default server({ auth });
```

Those routes are a passthrough: the request reaches them unparsed, so the
framework never consumes a body the library needs. A route of your own under
the same prefix is an error at boot rather than a silent shadow.

### Several at once

`auth` also takes an array, tried in order, with the first to return a user
winning:

```js
const staff = { providers: 'github', onLogin, getUser };
const mobile = { verify: ISSUER, audience: 'my-api', getUser };

export default server({ auth: [staff, mobile] })
  .get('/me', (ctx) => ctx.user);
```

Staff log in through us and carry a session cookie; the mobile app arrives
holding a token from elsewhere. Both land in `ctx.user`, and because both name
a `getUser` that reads the same table, the rest of the app cannot tell them
apart.

Mixing families without mapping to a common type is fine too, and then
`ctx.user` is a union:

```js
const auth = [
  { providers: 'github', onLogin, getUser },
  (ctx) => db.users.byApiKey(ctx.headers['x-api-key']),
];
```

## Databases

`auth` never takes a database. `onLogin`, `getUser` and `onLogout` are the only
points where it touches your data, so what lives where is entirely yours: no
database at all, a users table, or users and sessions in two different stores.

### No database

Omit the callbacks. The profile is signed into the credential, and `ctx.user`
is that profile on every later request.

```js
export default server({ auth: 'cookie:github' });
```

Right for a small tool where the provider is the source of truth. Wrong the
moment you need a role column, since there is nowhere to put one.

### Users in the database

One table. The credential holds a user id, and `getUser` resolves it on every
request, so roles and bans take effect immediately.

Postgres:

```js
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const auth = {
  providers: 'github',
  onLogin: async (profile) => {
    if (!profile.emailVerified) throw new Error('Verify your email first');
    const [user] = await sql`
      insert into users (email, name, avatar, github_id)
      values (${profile.email}, ${profile.name}, ${profile.avatar}, ${profile.id})
      on conflict (email) do update set name = excluded.name, avatar = excluded.avatar
      returning id`;
    return user.id;
  },
  getUser: async (id) => (await sql`select * from users where id = ${id}`)[0],
};

export default server({ auth });
```

Redis, where the email index is a second key because there are no secondary
indexes:

```js
import { createClient } from 'redis';

const redis = await createClient({ url: process.env.REDIS_URL }).connect();

const auth = {
  providers: 'github',
  onLogin: async (profile) => {
    if (!profile.emailVerified) throw new Error('Verify your email first');
    const id = (await redis.get(`email:${profile.email}`)) ?? crypto.randomUUID();
    const user = { id, email: profile.email, name: profile.name, avatar: profile.avatar };
    await redis.mSet([`email:${profile.email}`, id, `user:${id}`, JSON.stringify(user)]);
    return id;
  },
  getUser: async (id) => JSON.parse((await redis.get(`user:${id}`)) ?? 'null') ?? undefined,
};

export default server({ auth });
```

`getUser` must return `undefined` for a missing user, so the `?? undefined`
matters: `JSON.parse('null')` is `null`, which is a different kind of empty.

### Users and sessions

Two tables. `onLogin` returns the **session** id, so that is what the
credential points at, and `getUser` joins back to the user. This is what makes
logout real, and what lets people see and end their own sessions.

Postgres, one query per request:

```js
const auth = {
  providers: 'github',
  onLogin: async (profile, ctx) => {
    if (!profile.emailVerified) throw new Error('Verify your email first');
    const [user] = await sql`
      insert into users (email, name, avatar, github_id)
      values (${profile.email}, ${profile.name}, ${profile.avatar}, ${profile.id})
      on conflict (email) do update set name = excluded.name
      returning id`;
    const [session] = await sql`
      insert into sessions (user_id, user_agent, ip)
      values (${user.id}, ${ctx.headers['user-agent']}, ${ctx.ip})
      returning id`;
    return session.id;
  },
  getUser: async (id) => (await sql`
    select users.* from sessions
    join users on users.id = sessions.user_id
    where sessions.id = ${id}`)[0],
  onLogout: (id) => sql`delete from sessions where id = ${id}`,
};

export default server({ auth });
```

Listing and ending sessions is then your own route, with no auth API involved:

```js
  .get('/account/sessions', (ctx) =>
    sql`select id, user_agent, ip, created_at from sessions where user_id = ${ctx.user.id}`)
  .del('/account/sessions/:id', (ctx) =>
    sql`delete from sessions where id = ${ctx.url.params.id} and user_id = ${ctx.user.id}`)
```

Redis for both, where the session is a key with a TTL:

```js
const MONTH = 60 * 60 * 24 * 30;

const auth = {
  providers: 'github',
  expires: '30d',
  onLogin: async (profile) => {
    if (!profile.emailVerified) throw new Error('Verify your email first');
    const userId = (await redis.get(`email:${profile.email}`)) ?? crypto.randomUUID();
    const user = { id: userId, email: profile.email, name: profile.name };
    await redis.mSet([
      `email:${profile.email}`, userId,
      `user:${userId}`, JSON.stringify(user),
    ]);

    const session = crypto.randomUUID();
    await redis.set(`session:${session}`, userId, { EX: MONTH });
    return session;
  },
  getUser: async (id) => {
    const userId = await redis.getEx(`session:${id}`, { EX: MONTH });   // rolling
    if (!userId) return;
    return JSON.parse((await redis.get(`user:${userId}`)) ?? 'null') ?? undefined;
  },
  onLogout: (id) => redis.del(`session:${id}`),
};
```

Note the `getEx`. With `rolling: true` the credential is refreshed on use, so
the session key has to be refreshed with it, or the key expires under a cookie
that is still valid and people are logged out mid-use.

### Sessions in Redis, users in Postgres

The usual production split: sessions are hot, small and disposable, users are
durable and queried by the rest of the app.

```js
const auth = {
  providers: 'github',
  onLogin: async (profile) => {
    if (!profile.emailVerified) throw new Error('Verify your email first');
    const [user] = await sql`
      insert into users (email, name, avatar, github_id)
      values (${profile.email}, ${profile.name}, ${profile.avatar}, ${profile.id})
      on conflict (email) do update set name = excluded.name
      returning id`;

    const session = crypto.randomUUID();
    await redis.set(`session:${session}`, user.id, { EX: MONTH });
    return session;
  },
  getUser: async (id) => {
    const userId = await redis.getEx(`session:${id}`, { EX: MONTH });
    if (!userId) return;
    return (await sql`select * from users where id = ${userId}`)[0];
  },
  onLogout: (id) => redis.del(`session:${id}`),
};

export default server({ auth });
```

That is two round trips per request. Caching the user row in the session value
makes it one, at the cost of a role change not landing until the next login,
which is the same trade as the `'cookie'` strategy with an extra step.

## Framework Comparison

Three typical examples. The first is logging in with GitHub, so that the
logged-in user is available in every handler. The second checks a user's role.
The third makes sure a file belongs to the user before sending it to the UI.

Express stands in for the systems that are libraries rather than frameworks.
Every check is written inline: only framework-provided middleware appears, so
the difference in *how you reach the user* stays visible.

### Server

```ts
import server from '@server/next';

const auth = {
  strategy: 'session',
  providers: 'github',
  onLogin: async (profile) => (await db.users.upsert(profile)).id,
  getUser: (id) => db.users.getById(id),
};

export default server({ auth })

  // 1. LOGIN WITH GITHUB: /auth/login/github, its callback and /auth/logout
  //    are mounted for you. GITHUB_ID and GITHUB_SECRET come from the env.
  .get('/users/me', (ctx) => ctx.user)

  // 2. ADMIN ROLE: ctx.user is your own row, typed from getUser
  .get('/admin/users', (ctx) => {
    if (!ctx.user) return 401;
    if (ctx.user.role !== 'admin') return 403;
    return db.users.list();
  })

  // 3. OWNERSHIP: your table, your rule
  .get('/files/:id', async (ctx) => {
    if (!ctx.user) return 401;
    const file = await db.files.find(ctx.url.params.id);
    if (!file) return 404;
    if (file.userId !== ctx.user.id) return 403;
    return file;
  });
```

### AdonisJS

```ts
// 1. LOGIN WITH GITHUB: ally does the flow, the guard does the rest
router.get('/auth/github', ({ ally }) => ally.use('github').redirect())

router.get('/auth/github/callback', async ({ ally, auth, response }) => {
  const gh = ally.use('github')
  if (gh.accessDenied() || gh.stateMismatch()) return response.badRequest()

  const profile = await gh.user()
  const user = await User.firstOrCreate(
    { email: profile.email },
    { name: profile.name, role: 'member' },
  )
  await auth.use('web').login(user)          // issues the session cookie
  return response.redirect('/')
})

// 2. ADMIN ROLE: middleware.auth() guarantees auth.user, so only the role is
//    left to check. `auth.user` is your own model row, role column included.
router
  .get('/admin', ({ auth, response }) => {
    if (auth.user!.role !== 'admin') return response.forbidden()
    return 'welcome'
  })
  .use(middleware.auth())

// 3. OWNERSHIP: scope the query, so "not yours" and "not found" are one 404
router
  .get('/files/:id', async ({ auth, params, response }) => {
    const file = await File.query()
      .where('id', params.id)
      .where('userId', auth.user!.id)
      .first()
    if (!file) return response.notFound()
    return response.download(file.path)
  })
  .use(middleware.auth())
```

For richer rules Adonis has Bouncer policies
(`bouncer.with('FilePolicy').authorize('view', file)`), the same idea in a class.

### Passport (Express)

```js
// 1. LOGIN WITH GITHUB: you own both routes and the user mapping
passport.use(new GitHubStrategy({ clientID, clientSecret, callbackURL },
  async (accessToken, refreshToken, profile, done) => {
    const user = await db.users.upsertByGithub(profile.id, {
      name: profile.displayName, email: profile.emails?.[0]?.value,
    })
    done(null, user)                       // becomes req.user for this request
  }))

passport.serializeUser((user, done) => done(null, user.id))       // -> session
passport.deserializeUser(async (id, done) => done(null, await db.users.find(id)))

app.use(session({ secret, resave: false, saveUninitialized: false }))
app.use(passport.session())                // this is what sets req.user later

app.get('/auth/github', passport.authenticate('github'))
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/'))

// 2. ADMIN ROLE: req.user is your own record, deserialized from the session
app.get('/admin', (req, res) => {
  if (!req.user) return res.sendStatus(401)
  if (req.user.role !== 'admin') return res.sendStatus(403)
  res.send('welcome')
})

// 3. OWNERSHIP
app.get('/files/:id', async (req, res) => {
  if (!req.user) return res.sendStatus(401)
  const file = await db.files.find(req.params.id)
  if (!file || file.userId !== req.user.id) return res.sendStatus(404)
  res.sendFile(file.path)
})
```

### Better Auth (Express)

```js
import { betterAuth } from 'better-auth'
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node'

const auth = betterAuth({
  database,
  socialProviders: { github: { clientId, clientSecret } },
})

// 1. LOGIN WITH GITHUB: no routes of your own. It mounts its own, including
//    /api/auth/sign-in/social (provider: github), the callback and sign-out.
//    Must come BEFORE express.json(): it needs the raw body.
app.all('/api/auth/*', toNodeHandler(auth))
app.use(express.json())

// There is no req.user: reading the session is an async call, so wire it once
app.use(async (req, res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  req.user = session?.user
  next()
})

// 2. ADMIN ROLE: role lives on its user table (its admin plugin adds `role`)
app.get('/admin', (req, res) => {
  if (!req.user) return res.sendStatus(401)
  if (req.user.role !== 'admin') return res.sendStatus(403)
  res.send('welcome')
})

// 3. OWNERSHIP: your tables, your rule. Better Auth owns identity only
app.get('/files/:id', async (req, res) => {
  if (!req.user) return res.sendStatus(401)
  const file = await db.files.find(req.params.id)
  if (!file || file.userId !== req.user.id) return res.sendStatus(404)
  res.sendFile(file.path)
})
```

### Supabase Auth (Express)

```js
// 1. LOGIN WITH GITHUB happens in the BROWSER, not here:
//      await supabase.auth.signInWithOAuth({ provider: 'github' })
//    The client then sends the JWT on every request.

const jwks = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))

app.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /i, '')
  if (token) {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `${SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',            // pinning both is not optional
      })
      req.user = payload         // CLAIMS, not your row: sub, email, app_metadata
    } catch {}
  }
  next()
})

// 2. ADMIN ROLE: a claim in app_metadata (users cannot edit it), or a lookup
//    in your own profiles table keyed by `sub`
app.get('/admin', (req, res) => {
  if (!req.user) return res.sendStatus(401)
  if (req.user.app_metadata?.role !== 'admin') return res.sendStatus(403)
  res.send('welcome')
})

// 3. OWNERSHIP: the idiomatic Supabase answer is not an if statement. A Row
//    Level Security policy enforces it inside Postgres:
//      create policy "own files" on files for select
//        using (auth.uid() = user_id);
//    and you query *as the user* by forwarding their token:
app.get('/files/:id', async (req, res) => {
  const db = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.authorization } },
  })
  const { data } = await db.from('files').select().eq('id', req.params.id).single()
  if (!data) return res.sendStatus(404)      // RLS hid it, no check written
  res.sendFile(data.path)
})
```

### Clerk (Express)

```js
import { clerkMiddleware, getAuth } from '@clerk/express'

// 1. LOGIN WITH GITHUB: zero server routes. GitHub is enabled in the Clerk
//    dashboard and the frontend renders <SignIn />; Clerk hosts the whole UI.
app.use(clerkMiddleware())                  // verifies the session every request

// 2. ADMIN ROLE: no req.user. The user is behind an accessor, and what it
//    returns is Clerk's session, not your record
app.get('/admin', (req, res) => {
  const { userId, sessionClaims } = getAuth(req)
  if (!userId) return res.sendStatus(401)
  if (sessionClaims?.metadata?.role !== 'admin') return res.sendStatus(403)
  res.send('welcome')
})

// 3. OWNERSHIP: userId is Clerk's id, so your table stores it as the owner
app.get('/files/:id', async (req, res) => {
  const { userId } = getAuth(req)
  if (!userId) return res.sendStatus(401)
  const file = await db.files.find(req.params.id)
  if (!file || file.ownerId !== userId) return res.sendStatus(404)
  res.sendFile(file.path)
})
```

### Auth0 (Express)

```js
const { auth } = require('express-openid-connect')

// 1. LOGIN WITH GITHUB: GitHub is a "connection" configured in the Auth0
//    dashboard, so the app just says "log in". This one call CREATES the
//    /login, /logout and /callback routes for you.
app.use(auth({
  issuerBaseURL: 'https://YOUR_TENANT.auth0.com',
  baseURL: 'http://localhost:3000',
  clientID, secret,
  authRequired: false,
  authorizationParams: { connection: 'github' },   // skip the provider picker
}))

// 2. ADMIN ROLE: the user hangs off req.oidc, and roles are NOT in the token
//    by default: an Action adds them as a namespaced custom claim
const ROLES = 'https://myapp.example/roles'

app.get('/admin', (req, res) => {
  if (!req.oidc.isAuthenticated()) return res.sendStatus(401)
  if (!req.oidc.user[ROLES]?.includes('admin')) return res.sendStatus(403)
  res.send('welcome')
})

// 3. OWNERSHIP: `sub` is the stable Auth0 user id
app.get('/files/:id', async (req, res) => {
  if (!req.oidc.isAuthenticated()) return res.sendStatus(401)
  const file = await db.files.find(req.params.id)
  if (!file || file.ownerId !== req.oidc.user.sub) return res.sendStatus(404)
  res.sendFile(file.path)
})
```

### Where you reach the user, and what you get

| System | Where the user is | What it holds |
|--------|-------------------|---------------|
| Server | `ctx.user` | **your row**, typed from `getUser` |
| AdonisJS | `ctx.auth.user`, filled by the guard | **your model row** |
| Passport | `req.user`, filled by `passport.session()` | **your record** (whatever `deserializeUser` returns) |
| Better Auth | nowhere by default: you wire `req.user` from an **async** `auth.api.getSession()` | its user row |
| Supabase | nowhere by default: you wire it from the verified JWT | **claims**, not a row |
| Clerk | `getAuth(req)`, an **accessor call**, not a property | its session (`userId`, `sessionClaims`) |
| Auth0 | `req.oidc.user`, plus `req.oidc.isAuthenticated()` | id_token **claims** |

Task 1 differs wildly: you write two routes, or zero, or they are generated for
you. Task 2 is a one-line claim or column check in every single one. Task 3 is
always your own code against your own tables, with one exception: Supabase
pushes it into the database with RLS.

So authentication is where these systems differ, and authorization is where
they are all identical.

## Not decided

Everything above is written as though it exists. These are the gaps that would
show up on contact with an implementation.

- **Does the unsafe-secret boot guard cover all four strategies?** It is
  jwt-only today (`src/helpers/config.ts:150`), which is correct for the
  current code: `cookie` and `token` store a random id and look it up, so there
  is nothing to forge. Under this design a credential can carry a user id
  instead, which must be signed, so the guard has to widen with it.
- **What exactly identifies a third-party instance?** Shape-checking rather
  than adapters is settled; the fingerprint (`.handler` plus `.api.getSession`
  for Better Auth) is not, nor is which libraries qualify beyond it.
- **Do the mounted third-party routes appear in the OpenAPI spec?** We know
  their prefix, not their endpoints, and the endpoint list varies with their
  plugins. One wildcard entry is the likely answer.
- **Does the OIDC code flow need a signature check on the `id_token`?** It
  arrives over a direct TLS connection to the token endpoint, so the spec makes
  verification optional there. If that holds, login needs no key fetching at
  all and `verify` stays entirely separate.
- **Issuing a credential from your own route.** Deferred with email and
  password. Whenever a developer owns a login form, they need something like
  `ctx.login(id)` and `ctx.logout()`, and nothing here provides it.
