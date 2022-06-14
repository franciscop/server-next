import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import "dotenv/config";

import ServerUrl from "./ServerUrl.js";
import RequestLogger from "./RequestLogger.js";

import pathPattern from "./pathPattern.js";
import parseBody from "./parseBody.js";
import color from "./color.js";

const isProduction = process.env.NODE_ENV === "production";

// https://stackoverflow.com/a/19524949/938236
const getIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",").pop() ||
  req.connection.remoteAddress ||
  req.socket.remoteAddress ||
  req.connection.socket.remoteAddress;

const exists = (file) => {
  return fsp.stat(file, fs.constants.F_OK).then(
    (stat) => stat.isFile(),
    () => false
  );
};

const api = {
  get: [],
  post: [],
  put: [],
  patch: [],
  del: [],
  options: [],
  head: [],
};

const getCtx = (req) => ({
  url: new ServerUrl(req.protocol + "://" + req.headers["host"] + req.url),
  method: req.method.toLowerCase(),
  headers: req.headers,
  ip: getIp(req),
  time: { _init: performance.now() },
  api,
  req,
});

const createApp = (server) => {
  const app = function (...mid) {
    app.middleware.push(...mid.flat());
  };

  app.middleware = [
    async function (ctx) {
      if (ctx.method === "get") {
        const file = path.join(process.cwd(), ctx.options.public, ctx.url.path);
        const size = await fsp.stat(file).then(
          (stat) => stat.isFile() && stat.size,
          (err) => false
        );
        if (size) {
          return fs.createReadStream(file);
        }
      }
    },
  ];

  app.events = {
    error: [],
    ready: [],
  };

  app.on = (name, cb) => app.events[name].push(cb);
  app.close = () => server.close();

  return app;
};

const logStart = (port) => {
  if (isProduction) return;
  const routes = Object.values(api).flat().length;
  console.log(
    color(`Running on {under}http://localhost:${port}/{/} (${routes} routes)`)
  );
};

export default function (options = {}, plugins) {
  if (!options.public) {
    options.public = "public";
  }

  const server = http.createServer(async (req, res) => {
    const logger = new RequestLogger(req);
    const ctx = { ...getCtx(req), options };

    const parsed = await parseBody(ctx.req, ctx.headers["content-type"]);
    if (parsed) {
      ctx.body = parsed.body;
      ctx.files = parsed.files;
    }

    let out;
    ctx.res = { headers: {} };
    for (let cb of app.middleware) {
      out = await cb(ctx);
      if (out) {
        if (typeof out === "number") {
          // Plain number
          ctx.res.status = out;
          ctx.res.body = "";
          ctx.res.headers["content-type"] = "text/plain";
        } else if (typeof out === "string") {
          // Plain string
          ctx.res.status = 200;
          ctx.res.body = out;
          const isHtml = out.trim().startsWith("<");
          ctx.res.headers["content-type"] = isHtml ? "text/html" : "text/plain";
          ctx.res.headers["content-length"] = Buffer.byteLength(out);
        } else {
          if (out.pipe) {
            ctx.res.body = out;
            ctx.res.status = 200;
          } else {
            // Plain object
            if (out.type) ctx.res.headers["content-type"] = out.type;
            if (out.length) ctx.res.headers["content-length"] = out.length;
            ctx.res.headers = { ...ctx.res.headers, ...(out.headers || {}) };
            ctx.res.body = out.body || "";
            ctx.res.status = out.status || 200;
          }
        }
        break;
      }
    }

    ctx.time._total = performance.now();
    ctx.res.headers["server-timing"] = ctx.res.headers["server-timing"] || "";
    Object.entries(ctx.time).forEach(([name, value], i, times) => {
      if (name === "_init") return; // Index = 0
      ctx.res.headers["server-timing"] +=
        name + ";dur=" + Math.round(value - times[i - 1][1]);
      if (i !== times.length - 1) {
        ctx.res.headers["server-timing"] += ", ";
      }
    });
    res.writeHead(ctx.res.status, ctx.res.headers);
    if (ctx.res.body.pipe) {
      if (ctx.res.body.path) {
        ctx.res.type = ctx.res.body.path.split(".").pop();
        ctx.res.size = await fsp.stat(ctx.res.body.path).then((s) => s.size);
      } else {
        ctx.res.size = 0;
        ctx.res.body.on("data", function (chunk) {
          ctx.res.size += chunk.length;
        });
      }
      await pipeline(ctx.res.body, res);
    } else {
      res.end(ctx.res.body);
    }
    // The actual sent headers, as seen by the response
    ctx.res.headers = Object.fromEntries(
      res._header
        .split("\r\n")
        .filter(Boolean)
        .slice(1)
        .map((line) => {
          const [key, ...vals] = line.split(":");
          return [key.toLowerCase(), vals.join(":").trim()];
        })
    );

    logger.end(ctx);
  });

  const app = createApp(server);

  server.listen(options.port, (error) => {
    options.port = server.address().port;
    if (error) {
      app.events.error.forEach((cb) => cb(error));
      if (!isProduction) {
        console.error("Error:", error);
      }
    } else {
      app.events.ready.forEach((cb) => cb({ options }));
      logStart(options.port);
    }
  });

  return app;
}

export const get = (pattern, callback) => {
  api.get.push([pattern, callback]);

  return (ctx) => {
    if (ctx.method !== "get") return;
    const match = pathPattern(pattern, ctx.url.path);
    if (!match) return null;
    ctx.url.params = match;
    return callback(ctx);
  };
};

export const post = (pattern, callback) => {
  api.post.push([pattern, callback]);

  return (ctx) => {
    if (ctx.method !== "post") return;
    const match = pathPattern(pattern, ctx.url.path);
    if (!match) return null;
    ctx.url.params = match;
    return callback(ctx);
  };
};

export const put = (pattern, callback) => {
  api.put.push([pattern, callback]);

  return (ctx) => {
    if (ctx.method !== "put") return;
    const match = pathPattern(pattern, ctx.url.path);
    if (!match) return null;
    ctx.url.params = match;
    return callback(ctx);
  };
};

export const patch = (pattern, callback) => {
  api.patch.push([pattern, callback]);

  return (ctx) => {
    if (ctx.method !== "patch") return;
    const match = pathPattern(pattern, ctx.url.path);
    if (!match) return null;
    ctx.url.params = match;
    return callback(ctx);
  };
};

export const del = (pattern, callback) => {
  api.del.push([pattern, callback]);

  return (ctx) => {
    if (ctx.method !== "delete") return;
    const match = pathPattern(pattern, ctx.url.path);
    if (!match) return null;
    ctx.url.params = match;
    return callback(ctx);
  };
};

export const options = (pattern, callback) => {
  api.options.push([pattern, callback]);

  return (ctx) => {
    if (ctx.method !== "options") return;
    const match = pathPattern(pattern, ctx.url.path);
    if (!match) return null;
    ctx.url.params = match;
    return callback(ctx);
  };
};

export const head = (pattern, callback) => {
  api.head.push([pattern, callback]);

  return (ctx) => {
    if (ctx.method !== "head") return;
    const match = pathPattern(pattern, ctx.url.path);
    if (!match) return null;
    ctx.url.params = match;
    return callback(ctx);
  };
};

export const use = (pattern, callback) => {
  return (ctx) => {
    const match = pathPattern(pattern, ctx.url.path);
    if (!match) return null;
    ctx.url.params = match;
    return callback(ctx);
  };
};
