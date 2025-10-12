import auth from "../auth/index.js";
import { define, parseHeaders } from "../helpers/index.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";

// Headers come like [title1, value1, title2, value2, ...]
// https://stackoverflow.com/a/54029307/938236
const chunkArray = (arr, size) =>
  arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];

export default async (request, app) => {
  try {
    const ctx = {};
    ctx.options = app.opts || {};
    ctx.req = request;
    ctx.res = { status: null, headers: {}, cookies: {} };
    ctx.method = request.method.toLowerCase();

    // Private
    const events = {};
    ctx.on = (name, callback) => {
      events[name] = events[name] || [];
      events[name].push(callback);
    };
    ctx.trigger = (name, data) => {
      if (!events[name]) return;
      for (const cb of events[name]) {
        cb(data);
      }
    };

    ctx.headers = parseHeaders(new Headers(chunkArray(request.rawHeaders, 2)));
    ctx.cookies = parseCookies(ctx.headers.cookie);
    await auth.load(ctx);

    const https = request.connection.encrypted ? "https" : "http";
    const host = ctx.headers.host || `localhost:${ctx.options.port}`;
    const path = request.url.replace(/\/$/, "") || "/";
    ctx.url = new URL(path, `${https}://${host}`);
    define(ctx.url, "query", (url) =>
      Object.fromEntries(url.searchParams.entries()),
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
            ctx.options.uploads,
          );
          resolve();
        })
        .on("error", reject);
    });

    ctx.app = app;
    ctx.platform = app.platform;
    ctx.machine = app.platform;

    return ctx;
  } catch (error) {
    return { error };
  }
};
