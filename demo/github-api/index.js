import server, { file } from "../../";

// Sign in with GitHub from a single-page app: the browser owns the redirect,
// and the server only exchanges the code. No cookies, no redirects from us.
//
//   1. GET /auth/login/github  (Accept: application/json)  -> { url }
//   2. the page sends the visitor there, GitHub returns to /callback?code=...
//   3. POST /auth/verify/github { code }                   -> { ...user, token }
//
// Set GITHUB_ID and GITHUB_SECRET, and point the OAuth app's callback URL at
// http://localhost:3000/callback (this app's own page, not an API route).
export default server({
  auth: { strategy: "token", providers: ["github"], users: new Map() },
})
  .get("/", () => file("./public/index.html"))
  .get("/callback", () => file("./public/callback.html"))

  // The token is the whole credential, so the API is stateless from here on
  .get("/api/me", (ctx) => ctx.user || 401);
