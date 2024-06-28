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

  ctx.headers = request.headers;
  ctx.cookies = parseCookies(ctx.headers.cookie);
  ctx.session = await findSession(ctx);
  await findAuth(ctx);

  const https = request.connection.encrypted ? "https" : "http";
  const host = ctx.headers.host || "localhost" + options.port;
  const path = request.url.replace(/\/$/, "") || "/";
  ctx.url = new URL(path, `${https}://${host}`);
  define(ctx.url, "query", (url) =>
    Object.fromEntries(url.searchParams.entries())
  );

  await new Promise((resolve, reject) => {
    const body = [];
    request
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", async () => {
        const type = ctx.headers["content-type"];
        ctx.body = await parseBody(
          Buffer.concat(body).toString(),
          type,
          options.uploads
        );
        resolve();
      })
      .on("error", reject);
  });

  ctx.app = app;
  ctx.platform = app.platform;

  return ctx;
};
