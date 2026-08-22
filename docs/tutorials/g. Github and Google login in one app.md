# Github and Google login in one app

Offering one provider is a decision you make for your users; offering two is a decision you let them make. The mechanics are trivial, one more name in a list, but there is a real question hiding behind it: when the same person signs in with GitHub today and Google tomorrow, do they land on one account or two?

## 1. Name them

```js
import server from '@server/next';

const auth = {
  providers: ['github', 'google'],
  // Find or create the person by email, and return the id for the cookie
  onLogin: (profile) => db.users.upsertByEmail(profile).id,
  getUser: (id) => db.users.find(id),
};

export default server({ auth });
```

This assumes a `users` table of your own with a unique email, which is what makes the merging in step 2 work. [Google login persisted in SQLite](/tutorials/h-google-login-persisted-in-sqlite) covers the two callbacks on their own.

```sh
SECRETS=a-long-random-string
GITHUB_ID=...   GITHUB_SECRET=...
GOOGLE_ID=...   GOOGLE_SECRET=...
```

Each name mounts its own pair of routes, so the buttons are just links:

```html
<a href="/auth/login/github">Continue with GitHub</a>
<a href="/auth/login/google">Continue with Google</a>
```

Every provider reads `<NAME>_ID` and `<NAME>_SECRET` from the environment, and the name you write is the name in the route, so adding a third is one array entry and two variables. There are [63 to choose from](/documentation/authentication#the-providers).

Register each one's callback URL with that provider: `https://your-host/auth/callback/github` and `.../google`. A mismatch fails at their end, before your app is ever reached.

## 2. One account, either provider

The profile arriving at `onLogin` is normalised, so the one function above handles both providers. Which one it came from is in `profile.provider`, but every field is in the same place either way, which is why there is no branch in it.

Because the lookup keys on **email**, signing in with GitHub today and Google tomorrow finds the same row, returns the same id, and puts the same id in the cookie. From your app's point of view nothing happened: same person, same account, same data.

That is usually what people expect, and its absence is a common source of support tickets ("my projects are gone") from someone who clicked a different button than last time.

## 3. Record which ones are linked

Merging silently is fine until someone asks which accounts are connected, or you want to offer "disconnect Google". For that, store the provider's own id as you go:

Add a `github_id` and `google_id` column, then fill whichever one this login came through:

```js
  onLogin: (profile) => {
    const user = db.users.upsertByEmail(profile);
    db.users.update(user.id, { [`${profile.provider}_id`]: profile.id });
    return user.id;
  },
```

Building a column name from `profile.provider` is safe here only because your provider list is a fixed literal in the config: it is `'github'` or `'google'` and can never be anything else. It never comes from the request. Keep that list closed, and if your storage layer interpolates the key into SQL, remember a column name cannot be a bound parameter.

## 4. Which one is this request

Which provider signed someone in belongs to the login, not to the person, so it lives on [`ctx.auth`](/documentation/context#ctxauth) rather than `ctx.user`:

```js
  .get('/me', (ctx) => {
    if (!ctx.user) return 401;
    return { ...ctx.user, signedInWith: ctx.auth.provider };
  })
```

The distinction matters once accounts are linked: "this person" has both GitHub and Google attached, while "this session" came in through exactly one of them. Storing the provider on the user row would be answering the wrong question.

## 5. The caveat that matters

Merging on email means trusting the provider to have verified that the address belongs to the person signing in. GitHub and Google both do: they only hand back addresses they have confirmed, and GitHub only returns a private one after checking it.

That assumption is what makes this safe, and it is worth understanding because it does not hold universally. If you add a provider that returns unverified emails, someone could sign up there with **your** address and be merged straight into your account. Before adding one, check what its profile promises, look for its own verification flag in `profile.raw`, or key accounts on `profile.provider` plus `profile.id` and make linking an explicit action in account settings, confirmed by an email you send yourself.

## Next steps

- [Google login persisted in SQLite](/tutorials/h-google-login-persisted-in-sqlite): the table these callbacks write into.
- [Keycloak SSO with any OIDC issuer](/tutorials/o-keycloak-sso-with-any-oidc-issuer): adding a provider that is not on the list.
