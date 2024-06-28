import { define } from "../helpers/index.js";
import findAuth from "./findAuth.js";
import findSession from "./findSession.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";

export default async (request, options = {}, app) => {
  const ctx = {};
  ctx.options = options;
  ctx.req = request;
  ctx.res = { status: null, headers: {}, cookies: {} };
  ctx.method = request.method.toLowerCase();

  ctx.headers = Object.fromEntries(request.headers.entries());
  ctx.cookies = parseCookies(ctx.headers.cookie);
  ctx.session = await findSession(ctx);
  await findAuth(ctx);

  ctx.url = new URL(request.url.replace(/\/$/, ""));
  define(ctx.url, "query", (url) =>
    Object.fromEntries(url.searchParams.entries())
  );

  if (request.body) {
    const type = ctx.headers["content-type"];
    ctx.body = await parseBody(request, type, options.uploads);
  }

  ctx.app = app;
  ctx.platform = app.platform;

  return ctx;
};
