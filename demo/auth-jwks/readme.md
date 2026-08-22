# Hosted auth

One option covers Supabase, Auth0, Cognito, Keycloak, Zitadel, Logto, Okta,
Google and every other issuer of standard JWTs: point at the issuer, say who
the token should be for, and the claims land on `ctx.user`.

```js
server({ auth: { issuer: ISSUER, audience: AUDIENCE } });
```

No SDK, no dependency. The issuer's discovery document gives the key set, which
is fetched once and cached by key id, and every request checks the signature,
the issuer, the audience and the expiry.

```bash
ISSUER=https://<ref>.supabase.co/auth/v1 AUDIENCE=authenticated npm run dev
```

The login itself happens in the browser, with their SDK. Nothing is mounted
here: this app only checks what arrives.

## Why the audience matters

One issuer usually serves several applications, all signed with the same keys.
A token minted for a different app carries a valid signature and the same
issuer, so the audience is the only claim that separates them. It is required
for that reason, and the tests cover it.

## Tests

`npm test` runs the whole flow against a local issuer with its own RSA key
pair, its own discovery document and its own JWKS endpoint, so there is no
vendor and no network involved.
