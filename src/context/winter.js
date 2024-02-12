import { define } from "../helpers/index.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";

export default async (request, options = {}) => {
  const ctx = {};
  ctx.req = request;
  ctx.res = { status: null, headers: {}, cookies: {} };
  ctx.method = request.method.toLowerCase();

  define(ctx, "headers", () => Object.fromEntries(request.headers.entries()));
  define(ctx, "cookies", () => parseCookies(request.headers.get("cookie")));

  ctx.url = new URL(request.url.replace(/\/$/, ""));
  define(ctx.url, "query", (url) =>
    Object.fromEntries(url.searchParams.entries())
  );

  if (request.body) {
    const type = ctx.headers["content-type"];
    ctx.body = await parseBody(request, type, options.uploads);
  }

  return ctx;
};
