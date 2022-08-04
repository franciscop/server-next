import "dotenv/config";

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable, PassThrough } from "node:stream";

import ServerUrl from "./ServerUrl.js";
import RequestLogger from "./RequestLogger.js";

import logger from "./logger.js";
import getMime from "./getMime.js";
import pathPattern from "./pathPattern.js";
import parseBody from "./parseBody.js";

const isProduction = process.env.NODE_ENV === "production";

// https://stackoverflow.com/a/19524949/938236
const getIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",").pop() ||
  req.connection.remoteAddress ||
  req.socket.remoteAddress ||
  req.connection.socket.remoteAddress;

const measure = (ctx) => {
  const sizeUp = new PassThrough();
  ctx.res.size = 0;
  sizeUp.on("data", (chunk) => {
    ctx.res.size += chunk.length;
  });
  return sizeUp;
};

const findEncoding = (acceptEncoding) => {
  let encoding;
  if (/\bbr\b/.test(acceptEncoding)) {
    encoding = "br";
  } else if (/\bgzip\b/.test(acceptEncoding)) {
    encoding = "gzip";
  } else if (/\bdeflate\b/.test(acceptEncoding)) {
    encoding = "deflate";
  }

  const methods = {
    deflate: () => zlib.createDeflate(),
    gzip: () => zlib.createGzip(),
    br: () => zlib.createBrotliCompress(),
  };

  const compress = methods[encoding];
  return [encoding, compress];
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

    // Final error handling
    app.middleware.push({
      handle: (error) => {
        // console.clear();
        // console.log("ERROR!", error);
        return {
          status: 500,
          body: JSON.stringify({ error: error.message }),
          type: "application/json",
        };
      },
    });
  };

  // Static middleware
  app.middleware = [
    async function (ctx) {
      if (ctx.method !== "get") return;
      const file = path.join(process.cwd(), ctx.options.public, ctx.url.path);
      const size = await fsp.stat(file).then(
        (stat) => stat.isFile() && stat.size,
        () => false
      );
      if (size) {
        return fs.createReadStream(file);
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

let ttyWarn = null;
// if (!process.stdin.isTTY) {
//   ttyWarn = "Invalid terminal; cannot accept user input";
// }
// if (ttyWarn && process.env._.endsWith("nodemon")) {
//   ttyWarn = "when running with nodemon, please pass the flag --no-stdin";
// }

const parseOutput = async (res, data) => {
  // Plain number
  if (typeof data === "number") {
    res.status = data;
    res.body = "";
    res.type = "text/plain";
    return res;
  }

  // Plain string, which can only be text or html
  if (typeof data === "string") {
    res.status = 200;
    res.body = data;
    const isHtml = data.trim().startsWith("<");
    res.type = isHtml ? "text/html" : "text/plain";
    return res;
  }

  // When piping the output
  if (data.pipe) {
    res.body = data;
    res.status = 200;
    // It's a file; find its mimetype
    if (res.body.path) {
      res.type = await getMime(res.body.path);
    }
    return res;
  }

  // Plain object, merge it with the existing one
  if (data.type) res.type = data.type;
  res.headers = { ...res.headers, ...(data.headers || {}) };
  res.body = data.body || ""; // This could also be a pipe and that's okay
  res.status = data.status || 200;
  return res;
};

export default function (options = {}, plugins) {
  if (!options.public) {
    options.public = "public";
  }

  const server = http.createServer(async (req, res) => {
    const logger = new RequestLogger(req);
    const ctx = { ...getCtx(req), bucket: options.bucket, options };

    const parsed = await parseBody(
      ctx.req,
      ctx.headers["content-type"],
      ctx.bucket
    );
    if (parsed) {
      ctx.body = parsed.body;
      ctx.files = parsed.files;
    }

    let out;
    let err;
    ctx.res = { headers: {} };
    for (let cb of app.middleware) {
      try {
        if (err) {
          if (cb.handle) {
            out = await cb.handle(err);
          }
        } else {
          out = await cb(ctx);
        }
        if (out) {
          ctx.res = await parseOutput(ctx.res, out);
          break;
        }
      } catch (error) {
        err = error;
      }
    }

    if (ctx.res.type) {
      ctx.res.headers["content-type"] = ctx.res.type;
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

    const [encoding, compress] = findEncoding(ctx.headers["accept-encoding"]);
    if (encoding) {
      ctx.res.headers["content-encoding"] = encoding;
    }

    res.writeHead(ctx.res.status, ctx.res.headers);

    // If it's not a pipe, e.g. a String, make it a pipe
    if (!ctx.res.body.pipe) {
      ctx.res.body = Readable.from([ctx.res.body]);
    }

    if (compress) {
      await pipeline(ctx.res.body, compress(), measure(ctx), res);
    } else {
      await pipeline(ctx.res.body, measure(ctx), res);
    }
    res.end();

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
    if (err) {
      logger.error(err);
    }
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
      logger.header({ api, options });
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
