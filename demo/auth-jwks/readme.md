# Hosted auth via JWKS

One middleware covers Supabase, Auth0, Cognito, Keycloak, Zitadel, Logto,
Okta, Google, Apple and every other issuer of standard JWTs: verify the bearer
token against the issuer's public keys with [jose](https://github.com/panva/jose)
(456KB, no dependencies, edge-safe), and put the claims on `ctx.user`.

```bash
npm install
ISSUER=https://<ref>.supabase.co/auth/v1 AUDIENCE=authenticated npm run dev
```

```bash
curl localhost:3000/me -H "Authorization: Bearer <a token from your issuer>"
```

## Two things worth copying

**Discover the keys, don't hardcode the URL.** The JWKS *format* is standard
but the path is not: Google serves `/oauth2/v3/certs`, Apple `/auth/keys`,
Slack `/openid/connect/keys`, Microsoft `/common/discovery/v2.0/keys`. Only
Auth0-style issuers use `/.well-known/jwks.json`. What every issuer does serve
is `/.well-known/openid-configuration`, which names `jwks_uri` and `issuer`.

**Pin the issuer and the audience.** Verifying only the signature accepts any
token that issuer minted, including one for a *different application* on the
same tenant, which is cross-app impersonation. The test covers exactly that
case.

## Notes

- Sign-in happens on the vendor's side (their pages or client SDK); the server
  only verifies, which is why there are no routes to mount here.
- The test runs the whole flow with no vendor: it generates a key pair, serves
  its own discovery document and JWKS from a second `server()` instance, and
  checks that wrong-signature, wrong-audience and wrong-issuer tokens are all
  rejected.
- Verification is stateless, so revoking one session is the vendor's business
  and takes effect when the token expires.
