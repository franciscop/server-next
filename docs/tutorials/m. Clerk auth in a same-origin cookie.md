# Clerk auth in a same-origin cookie

Clerk hosts the whole sign-in experience: the form, the social buttons, the password resets, and the user database behind them. You drop their components into your frontend and they handle everything up to the point where someone is signed in.

What reaches your server is a **session token**, a short-lived JWT Clerk issues for that person. Your job is to check it. Nothing is mounted, no secret is exchanged, and Clerk stays the source of truth for who exists.

For an app served from your own domain, Clerk stores that token in a cookie, which means a plain page navigation carries it without any code attaching a header.

## 1. Read their cookie

```js
import server from '@server/next';

export default server({ auth: 'cookie:clerk' })
  .get('/', (ctx) => ctx.user ? `Hello ${ctx.user.sub}` : 'Signed out');
```

```sh
CLERK_ISSUER=https://touched-donkey-12.clerk.accounts.dev
CLERK_AUDIENCE=https://app.example.com
```

`cookie:clerk` reads their `__session` cookie and verifies it against Clerk's published keys, which are fetched once and cached. The prefix means what it means everywhere else in this framework: `cookie` is a token carried in a cookie, `jwt` is one carried in an `Authorization` header. Only the keys that verify it differ, and here they are Clerk's rather than yours.

Use `jwt:clerk` instead when the caller is a native app or a frontend on another origin, since neither can rely on your domain's cookies. Everything else about the setup is identical.

## 2. The part people get wrong

**Clerk session tokens have no `aud` claim at all.**

Almost every other issuer puts the intended recipient in `aud`, so the natural move is to set the audience to an API identifier the way you would for Auth0. Do that here and every single token is rejected, with a bare `401` that says nothing about which claim failed. It is a genuinely unpleasant hour of debugging.

What Clerk uses instead is `azp`, the *authorized party*, and it holds the origin your frontend is served from. So `CLERK_AUDIENCE` is a URL like `https://app.example.com`, and it is checked against a different claim. That is what their own backend SDK does too, under the name `authorizedParties`.

The `'cookie:clerk'` shorthand knows this and sets it for you. Written out, it is:

```js
const auth = {
  issuer: process.env.CLERK_ISSUER,
  audience: 'https://app.example.com',   // your frontend origin, found in `azp`
  audienceClaim: 'azp',
  cookie: '__session',
};
```

If your app is served from several origins, `audience` also takes an array.

## 3. Your own users

Out of the box `ctx.user` is the claims: `sub` (Clerk's user id), `sid` (the session), `azp`, plus anything you added as a custom claim in their dashboard. That is enough while you are only identifying people.

Once you have your own tables, you need your id beside theirs:

```js
const auth = {
  issuer: process.env.CLERK_ISSUER,
  audience: 'https://app.example.com',
  audienceClaim: 'azp',
  cookie: '__session',
  getUser: (id) => db.users.byClerkId(id),   // `id` is the `sub` claim
};
```

The last four lines are what the shorthand was setting; `getUser` is the reason to write it out.

Store Clerk's `sub` as the foreign key rather than the email, which people change and which Clerk lets them have several of. Create the row from Clerk's `user.created` [webhook](https://clerk.com/docs/integrations/webhooks) so your table is populated before anyone's first request, rather than lazily on a cache miss.

## 4. Signing out

There is nothing of ours to clear, so `POST /auth/logout` is not mounted. Clerk's frontend SDK ends the session and clears its own cookie; from your server's side the tokens simply stop verifying.

How quickly that happens is set by the session lifetime in the Clerk dashboard, since a signed token cannot be recalled once issued. Short lifetimes mean a revoked session dies sooner and the SDK refreshes more often, which is the usual trade.

## 5. Local development

Clerk issues tokens from a development instance with a different issuer to production, so `CLERK_ISSUER` differs per environment. Point it at the development one locally and the production one in your deploy, the same as any other environment variable, and expect a `401` if you cross the wires: a production token will fail the issuer check against a development URL, which is exactly what should happen.

## Next steps

- [The vendor table](/documentation/authentication#by-name): what each hosted service puts where, and which claim carries the audience.
- [Supabase auth with your own users](/tutorials/l-supabase-auth-with-your-own-users): the same pattern with a header instead of a cookie.
