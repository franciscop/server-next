import server, { file } from "../../";

// Sign in with GitHub from a single-page app. The client holds the credential,
// so nothing here sets a cookie:
//
//   1. GET /auth/login/github  (Accept: application/json)  -> { url }
//   2. the page sends the visitor there
//   3. GitHub returns to /auth/callback/github, which redirects to `/`
//      with the token in the URL fragment: /#token=eyJ...
//   4. the page reads it and sends it as `Authorization: Bearer <token>`
//
// A fragment rather than a query string, because browsers never send it to a
// server, so it stays out of access logs and referrer headers.
//
// Set GITHUB_ID and GITHUB_SECRET, and point the OAuth app's callback URL at
// http://localhost:3000/auth/callback/github
export default server({
  auth: { providers: "github", strategy: "jwt", redirect: "/" },
})
  .get("/", () => file("./public/index.html"))

  // The token is the whole credential, so the API is stateless from here on
  .get("/api/me", (ctx) => ctx.user || 401);
