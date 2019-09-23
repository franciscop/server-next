import parseUrl from "../helpers/parseUrl.js";

const runtime = "cloudflare";

// Launch the server in a Cloudflare Worker
export default (handler, options = {}) => {
  addEventListener("fetch", e => {
    const req = e.request;
    const path = new URL(req.url).pathname;
    // At least one header has to be read first so that .entries() works
    const ip = req.headers.get("CF-Connecting-IP");
    const headers = {};
    for (let entry of req.headers.entries()) {
      headers[entry[0]] = entry[1];
    }
    const ctx = {
      ...parseUrl(path),
      url: path,
      method: req.method,
      headers,
      options,
      runtime,
      ip,
      req
    };
    const response = handler(ctx).then(({ status, body, headers }) => {
      return new Response(body, { status, headers });
    });
    return e.respondWith(response);
  });
  return Promise.resolve({ options, handler, runtime, close: () => {} });
};
