import server from "../..";

// Hosted auth (Supabase, Auth0, Cognito, Keycloak, Zitadel, Logto, Okta,
// Google...) all end the same way on the server: the client signs in over
// there, then sends a JWT on every request and you check it against the
// issuer's published keys. One option covers every one of them, with no vendor
// SDK and no dependency.
//
//   ISSUER=https://<ref>.supabase.co/auth/v1   AUDIENCE=authenticated
//   ISSUER=https://<tenant>.auth0.com          AUDIENCE=https://api.myapp.com

const ISSUER = process.env.ISSUER || "http://localhost:3001";
const AUDIENCE = process.env.AUDIENCE || "my-app";

// `audience` is required, and that is the point: one issuer serves many
// applications, all signed with the same keys, so a token minted for a
// different app carries a valid signature and the same issuer. The audience is
// the only claim that separates them.
const auth = { verify: ISSUER, audience: AUDIENCE };

export default server({ auth })
  // No token is anonymous; a broken one is a 401 before this runs
  .get("/me", (ctx) => ctx.user ?? 401)

  .get("/admin", (ctx) => {
    if (!ctx.user) return 401;
    // Supabase puts app-controlled claims in `app_metadata`, Auth0 in a
    // namespaced claim; either way it is a plain read off ctx.user
    if (ctx.user.app_metadata?.role !== "admin") return 403;
    return "welcome";
  });
