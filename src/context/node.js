import auth from "../auth/index.js";
import { define } from "../helpers/index.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";

// https://stackoverflow.com/a/54029307/938236
const chunkArray = (arr, size) =>
  arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];

export default async (request, options = {}, app) => {
  const ctx = {};
  ctx.options = options;
  ctx.req = request;
  ctx.res = { status: null, headers: {}, cookies: {} };
  ctx.method = request.method.toLowerCase();

  ctx.headers = parseHeaders(new Headers(chunkArray(request.rawHeaders, 2)));
  ctx.cookies = parseCookies(ctx.headers.cookie);
  await auth.load(ctx);

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
