import server from "../..";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Hosted auth (Supabase, Auth0, Cognito, Keycloak, Zitadel, Logto, Okta,
// Google, Apple...) all end the same way on the server: the client sends a
// JWT and you verify it against the issuer's public keys. One middleware
// covers every one of them, with no vendor SDK.
//
//   ISSUER=https://<ref>.supabase.co/auth/v1
//   ISSUER=https://<tenant>.auth0.com

const ISSUER = process.env.ISSUER || "http://localhost:3001";
const AUDIENCE = process.env.AUDIENCE || "my-app";

// The JWKS path is NOT standard (Google uses /oauth2/v3/certs, Apple
// /auth/keys, Slack /openid/connect/keys...). The discovery document is, so
// read `jwks_uri` and `issuer` from it instead of hardcoding a URL.
const discovery = await fetch(
  `${ISSUER}/.well-known/openid-configuration`,
).then((res) => res.json());

const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));

export default server()
  .use(async (ctx) => {
    const header = String(ctx.headers.authorization || "");
    if (!header.toLowerCase().startsWith("bearer ")) return;
    try {
      // Pinning `issuer` and `audience` is not optional: verifying only the
      // signature accepts any token that issuer minted, including ones for a
      // different application entirely.
      const { payload } = await jwtVerify(header.slice(7), jwks, {
        issuer: discovery.issuer,
        audience: AUDIENCE,
      });
      ctx.user = payload; // sub, email, and whatever the issuer adds
    } catch {
      // Invalid, expired, or for another app: an anonymous request
    }
  })
  .get("/", (ctx) => (ctx.user ? `Hi ${ctx.user.email}` : "Anonymous"))
  .get("/me", (ctx) => ctx.user || 401);
