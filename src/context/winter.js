import auth from "../auth/index.js";
import { define, parseHeaders } from "../helpers/index.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";

export default async (request, app) => {
  const ctx = {};
  ctx.init = performance.now();
  ctx.options = app.opts || {};
  ctx.req = request;
  ctx.res = { status: null, headers: {}, cookies: {} };
  ctx.method = request.method.toLowerCase();

  // Private
  const events = {};
  ctx.unstableOn = (name, callback) => {
    events[name] = events[name] || [];
    events[name].push(callback);
  };
  ctx.unstableFire = (name, data) => {
    if (!events[name]) return;
    for (const cb of events[name]) {
      cb(data);
    }
  };

  ctx.headers = parseHeaders(request.headers);
  ctx.cookies = parseCookies(ctx.headers.cookie);
  await auth.load(ctx);

  ctx.url = new URL(request.url.replace(/\/$/, ""));
  define(ctx.url, "query", (url) =>
    Object.fromEntries(url.searchParams.entries()),
  );

  if (request.body) {
    const type = ctx.headers["content-type"];
    ctx.body = await parseBody(request, type, ctx.options.uploads);
  }

  ctx.app = app;
  ctx.platform = app.platform;
  ctx.machine = app.platform;

  return ctx;
};
