import http from "node:http";
import "dotenv/config";
import Spinnies from "spinnies";
import open from "open";

import pathPattern from "./pathPattern.js";

const isProduction = process.env.NODE_ENV === "production";

const getUrl = ({ protocol = "http", headers, url = "/" }) => {
  return protocol + "://" + headers["host"] + url;
};

// https://stackoverflow.com/a/19524949/938236
const getIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",").pop() ||
  req.connection.remoteAddress ||
  req.socket.remoteAddress ||
  req.connection.socket.remoteAddress;

const api = {};

const getCtx = (req) => ({
  url: getUrl(req),
  method: req.method,
  headers: req.headers,
  ip: getIp(req),
  api,
});

const createApp = (server) => {
  const app = function (...mid) {
    app.middleware.push(...mid.flat());
  };

  app.middleware = [];

  app.events = {
    error: [],
    ready: [],
  };

  app.on = (name, cb) => app.events[name].push(cb);
  app.close = () => server.close();

  return app;
};

const findSize = (res, out) => {
  if (out.data) return out.data.length;
  if (!res._header) return 0;
  const lenLine = res._header
    .split("\r\n")
    .find((line) => /^Content-Length: /.test(line));
  if (lenLine) return lenLine.split(": ").pop() || 0;
  return out.length || 0;
};

export default function (options = {}, plugins) {
  const spinnies = new Spinnies({ succeedColor: "white", failColor: "white" });
  let i = 0;

  const server = http.createServer(async (req, res) => {
    i++;
    const ctx = { ...getCtx(req), options };
    const url = new URL(ctx.url);
    ctx.pathname = url.pathname;
    const pathname = ctx.pathname;

    let spinner;
    if (!isProduction) {
      spinnies.add(`spinner-${pathname}`, {
        text: `\x1b[2m[${ctx.method}]\x1b[0m ${url.pathname}`,
      });
    }

    let out;
    let type = "text/plain";
    for (let cb of app.middleware) {
      out = await cb(ctx);
      if (out) {
        if (typeof out === "number") {
          res.writeHead(out, undefined, { "content-type": type });
          res.end();
        } else if (typeof out === "string") {
          type = out.trim().startsWith("<") ? "text/html" : "text/plain";
          res.writeHead(200, "OK", { "content-type": type });
          res.end(out);
        } else {
          type = out.type;
          res.writeHead(out.status, "OK", { "content-type": out.type });
          res.end(out.data);
        }
        break;
      }
    }
    const resSize = findSize(res, out);

    // const type = res.getHeaders()["content-type"];
    const paddedPath = (url.pathname + " \x1b[2m").padEnd(30, "╌");
    const size = (n) =>
      (n / 1000).toFixed(1).padStart(5, " ") + " \x1b[2mkb\x1b[0m";
    const status = res.statusCode;
    const succeed = status < 500;
    const method = succeed ? "succeed" : "fail";
    let simpleType = type;
    switch (type) {
      case "text/html":
        simpleType = "html";
        break;
      case "text/plain":
        simpleType = "text";
        break;
      case "image/svg+xml":
        simpleType = "svg";
        break;
      case "image/png":
        simpleType = "png";
        break;
      case "text/css":
        simpleType = "css";
        break;
      case "application/javascript":
        simpleType = "js";
        break;
    }
    spinnies.succeed(`spinner-${pathname}`, {
      text: `\x1b[2m[${ctx.method}]\x1b[0m ${paddedPath}›\x1b[0m ${
        status < 299
          ? "\x1b[32m"
          : status > 300 && status <= 500
          ? "\x1b[33m"
          : "\x1b[31m"
      }[${status}]\x1b[0m ${size(resSize)}  ${simpleType}`,
    });
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
      if (!isProduction) {
        console.error(
          `Live: \x1b[4mhttp://localhost:${options.port}/\x1b[0m • API docs: \x1b[4mhttp://localhost:${options.port}/_api\x1b[0m`
        );
        // open(`http://localhost:${options.port}`);
      }
    }
  });

  return app;
}

export const get = (pattern, callback) => {
  api.get = api.get || [];
  api.get.push([pattern, callback]);

  return (ctx) => {
    if (ctx.method.toLowerCase() !== "get") return;
    const match = pathPattern(pattern, ctx.pathname);
    if (!match) return null;
    ctx.params = match;
    return callback(ctx);
  };
};
