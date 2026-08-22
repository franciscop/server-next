// Auth vendors we can verify tokens from. They all publish their keys the same
// way, so the only per-vendor knowledge is where the token rides and which
// environment variables hold the tenant's issuer and audience.
//
// Unlike a login provider, none of these mounts a route: the person signs in
// over there, and every request arrives already carrying a token.
//
// Only vendors that are not also login providers live here, so a name never
// means two things. Auth0, Cognito and Keycloak are providers you can log in
// with, so verifying their tokens uses the explicit `{ verify, audience }`.
export type Vendor = {
  // Where their SDK stores the token for a same-origin app, when it does. The
  // ones that keep it in memory or localStorage have no cookie to read.
  cookie?: string;
  // What `audience` should look like, for the error when it is missing
  audience: string;
  // Which claim carries it. Standard is `aud`, and the exceptions are the
  // reason this is per-vendor rather than assumed.
  claim?: string | string[];
  docs: string;
};

const VENDORS: Record<string, Vendor> = {
  clerk: {
    cookie: "__session",
    // Clerk session tokens carry no `aud`: the authorized party (your
    // frontend origin) is in `azp`, which is what their own SDK checks
    audience: "your frontend origin, like https://app.example.com",
    claim: "azp",
    docs: "https://clerk.com/docs/backend-requests/resources/session-tokens",
  },
  firebase: {
    // The client SDK holds the token and sends it as a header, so no cookie.
    // Both halves are the project id: the issuer is per-project, and it is
    // what Firebase puts in `aud`.
    audience: "your Firebase project id",
    docs: "https://firebase.google.com/docs/auth/admin/verify-id-tokens",
  },
  // Google Cloud Identity Platform is the same service, and the same tokens,
  // under its enterprise name
  gcip: {
    audience: "your Google Cloud project id",
    docs: "https://cloud.google.com/identity-platform/docs/how-to-verify-tokens",
  },
  supabase: {
    audience: '"authenticated"',
    docs: "https://supabase.com/docs/guides/auth/jwts",
  },
};

export default VENDORS;
