import { define } from "../helpers/index.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";

export default async (request, options = {}) => {
  const ctx = {};
  ctx.req = request;
  ctx.res = { status: null, headers: {}, cookies: {} };
  ctx.method = request.method.toLowerCase();

  ctx.headers = request.headers;
  define(ctx, "cookies", () => parseCookies(request.headers.cookie));

  const https = request.connection.encrypted ? "https" : "http";
  const host = ctx.headers.host || "localhost" + options.port;
  const path = request.url.replace(/\/$/, "") || "/";
  ctx.url = new URL(path, `${https}://${host}`);
  define(ctx.url, "query", (url) =>
    Object.fromEntries(url.searchParams.entries())
  );

  if (request.body) {
    const type = ctx.headers["content-type"];
    ctx.body = await parseBody(request, type, options.uploads);
  }

  return ctx;
};
