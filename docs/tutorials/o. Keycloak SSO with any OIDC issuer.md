# Keycloak SSO with any OIDC issuer

The 63 named providers cover the public services, where the URL is the same for everybody. Identity servers a company runs for itself are different: the endpoints live on `sso.acme.com` for one customer and `login.globex.net` for the next, so there is no name to ship.

They do have something better. Anything speaking OpenID Connect publishes its own configuration at a fixed path, so a single URL is the entire integration.

## 1. Point at the realm

```js
import server from '@server/next';

const auth = {
  providers: {
    work: 'https://sso.company.com/realms/employees',
  },
  onLogin: (profile) => upsertUser(profile).id,
  getUser: (id) => db.users.find(id),
};

export default server({ auth });
```

```sh
SECRETS=a-long-random-string
WORK_ID=my-client-id
WORK_SECRET=...
```

On first use the framework fetches `https://sso.company.com/realms/employees/.well-known/openid-configuration`, a small JSON document listing where to send people, where to exchange the code, and which keys sign the tokens. That document is why nothing else needs configuring, and why this same entry works for Okta, Zitadel, Authentik, FusionAuth, Ory and Entra with a tenant URL.

**The key name is yours.** `work` names the route (`/auth/login/work`), the environment variables (`WORK_ID` and `WORK_SECRET`) and the value in `profile.provider`. Pick what makes sense to the people using it: `sso`, `staff`, `company`. It is the word that ends up in your login button's URL.

## 2. Register the redirect URI

In the Keycloak client, add `https://your-host/auth/callback/work` as a valid redirect URI, matching the name you chose above.

This is the step that most often goes wrong, and the failure is unhelpful: the person never reaches your app, they get an error page on the identity server instead, so nothing appears in your logs. If a login dead-ends before returning, check this first.

## 3. Two realms, two names

Companies commonly separate staff from customers into different realms, with different login pages and different rules. They are just two entries:

```js
providers: {
  staff: 'https://sso.company.com/realms/employees',      // STAFF_ID, STAFF_SECRET
  customers: 'https://sso.company.com/realms/customers',  // CUSTOMERS_ID, CUSTOMERS_SECRET
},
```

Two routes, two buttons, two sets of credentials, and [`ctx.auth.provider`](/documentation/context#ctxauth) tells a handler which one a given request came through. That is often enough to gate an internal admin area without any roles at all: staff signed in through `staff`, and nobody else can.

## 4. Groups and roles

An OIDC token carries a standard set of claims (`sub`, `email`, `name`, `picture`), which become the normalised profile. Everything an identity server adds beyond that is its own, and arrives untouched in `profile.raw`:

```js
  onLogin: (profile) => {
    const groups = profile.raw.groups ?? [];
    const id = upsertUser(profile).id;
    db.users.update(id, { role: groups.includes('admins') ? 'admin' : 'member' });
    return id;
  },
```

There is a step on the Keycloak side that is easy to miss: **claims are not in the token unless a mapper puts them there.** Group membership exists in Keycloak's database, but until you add a group or role mapper to that client, `profile.raw.groups` is simply absent. If the array is always empty, the mapper is the thing to check, not your code.

Note this reads the groups **at login**, and writes a role you then own. The alternative, reading `profile.raw` on every request, is not available, because after the handshake you are working from your own credential and the identity server is out of the picture. Someone removed from a group keeps their role until they sign in again, which is worth knowing when the change is a revocation. If that matters, keep sessions short.

## 5. Not to be confused with verifying

Everything above **mounts a login**: your server sends people to Keycloak and issues its own credential when they come back.

There is a second, different arrangement with the same URL, where a frontend has already signed people in and simply sends you Keycloak's token:

```js
const auth = { issuer: 'https://sso.company.com/realms/employees', audience: 'my-client-id' };
```

No routes, no client secret, and `ctx.user` is the token's claims. Same identity server, opposite direction: in the first your app runs the login, in the second it only inspects the result. Which one you want depends on whether your server or your frontend is the thing talking to Keycloak.

## Next steps

- [The provider table](/documentation/authentication#the-providers): the 63 that need only a name.
- [Supabase auth with your own users](/tutorials/l-supabase-auth-with-your-own-users): the verify shape in full.
