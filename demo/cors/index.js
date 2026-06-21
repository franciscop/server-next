import server from "../..";

// CORS demo. This server only allows cross-origin requests from one origin, and
// sends credentials. Run it and try the requests below:
//
//   $ node index.js        (or: bun index.js)
//
// A real (non-preflight) request gets the CORS headers reflected back:
//
//   curl -i -H 'Origin: https://example.com' localhost:3000/data
//   → Access-Control-Allow-Origin: https://example.com
//   → Access-Control-Allow-Credentials: true
//
// A preflight (OPTIONS) is answered automatically with a 204:
//
//   curl -i -X OPTIONS \
//     -H 'Origin: https://example.com' \
//     -H 'Access-Control-Request-Method: POST' \
//     localhost:3000/data
//   → 204, Access-Control-Allow-Methods: GET,POST,...
//
// Errors get CORS headers too, so the browser can read them:
//
//   curl -i -H 'Origin: https://example.com' localhost:3000/missing   → 404 + CORS
//
// A disallowed origin gets no CORS headers (the browser then blocks it):
//
//   curl -i -H 'Origin: https://evil.com' localhost:3000/data         → no CORS header
//
// With `credentials: true` the exact origin is reflected instead of the `*`
// wildcard (which the spec forbids alongside credentials).

export default server({
  cors: { origin: "https://example.com", credentials: true },
})
  .get("/data", () => ({ hello: "world" }))
  .post("/data", (ctx) => ({ received: ctx.body }));
