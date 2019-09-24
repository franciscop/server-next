const runtime = "cloudflare";

const getIp = req => req.headers.get("CF-Connecting-IP");

// At least one header has to be read first so that .entries() works
const getHeaders = ({ headers }) => {
  const plain = {};
  for (let entry of headers.entries()) {
    headers[entry[0]] = entry[1];
  }
  return plain;
};

// Launch the server in a Cloudflare Worker
export default (handler, options = {}) => {
  addEventListener("fetch", e => {
    const response = handler({
      url: e.request.url,
      method: e.request.method,
      headers: getHeaders(e.request),
      ip: getIp(e.request),
      runtime,
      req: e.request
    }).then(({ status, body, headers }) => {
      return new Response(body, { status, headers });
    });
    return e.respondWith(response);
  });
  return Promise.resolve({ options, handler, runtime, close: () => {} });
};
