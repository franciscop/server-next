const decode = decodeURIComponent;

// Parse the query from the url (without the `?`)
const parseQuery = (query = "") => {
  return query
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .map(p => p.split("="))
    .reduce((all, [key, val]) => ({ ...all, [decode(key)]: decode(val) }), {});
};

// Available in Node since 10.0.0
// https://nodejs.org/api/globals.html#globals_url
export default async ctx => {
  const url = new URL(ctx.url);
  ctx.protocol = url.protocol;
  ctx.host = url.host;
  ctx.port = url.port;
  ctx.hostname = url.hostname;
  ctx.password = url.password;
  ctx.username = url.username;
  ctx.origin = url.origin;
  ctx.path = url.pathname;
  ctx.query = parseQuery(url.search);
};
