import auth from "../auth/index.js";
import { define, parseHeaders } from "../helpers/index.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";

export default async (request, options = {}, app) => {
  const ctx = {};
  ctx.options = options;
  ctx.req = request;
  ctx.res = { status: null, headers: {}, cookies: {} };
  ctx.method = request.method.toLowerCase();

  ctx.headers = parseHeaders(request.headers);
  ctx.cookies = parseCookies(ctx.headers.cookie);
  await auth.load(ctx);

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
  ctx.machine = app.platform;

  return ctx;
};
