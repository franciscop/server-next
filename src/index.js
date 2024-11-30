import "./polyfill.js";
import "./errors/index.js";

import createNodeContext from "./context/node.js";
import createWinterContext from "./context/winter.js";
import {
  config,
  getMachine,
  handleRequest,
  iterate,
  parseHeaders,
} from "./helpers/index.js";

import { assets, auth, timer } from "./middle/index.js";

// Export the reply helpers
export * from "./reply.js";

export { default as ServerError } from "./ServerError.js";

// Allow to create a sub-router
export { default as router } from "./router.js";

// #region server()
export default function server(options = {}) {
  // Make it so that the exported one is a prototype of function()
  if (!(this instanceof server)) {
    return new server(options).self();
  }

  // Keep a copy of the options in the instance
  this.opts = config(options);
  this.platform = getMachine();

  // TODO: find a way to remove this hack
  this.extended = false;

  // Skip "forbidden methods" https://fetch.spec.whatwg.org/#concept-method
  this.handlers = {
    socket: [],
    get: [],
    head: [],
    post: [],
    put: [],
    patch: [],
    delete: [],
    options: [],
  };

  this.sockets = [];
  // Note: required by Bun
  this.websocket = {
    message: async (socket, body) => {
      this.handlers.socket
        ?.filter((s) => s[1] === "message")
        ?.map((s) => s[2]({ socket, sockets: this.sockets, body }));
    },
    open: (ws) => {
      this.sockets.push(ws);
      this.handlers.socket
        ?.filter((s) => s[1] === "open")
        ?.map((s) => s[2]({ socket, sockets: this.sockets, body }));
    },
    close: (ws) => {
      this.sockets.splice(this.sockets.indexOf(ws), 1);
      this.handlers.socket
        ?.filter((s) => s[1] === "close")
        ?.map((s) => s[2]({ socket, sockets: this.sockets, body }));
    },
  };

  // Initialize it right away for Node.js
  if (this.platform.runtime === "node") {
    this.node();
  }

  this.use(timer);
  this.use(assets);
  if (this.opts.auth) {
    this.use(auth({ options: this.opts, app: this }));
  }
}

server.prototype.self = function () {
  const cb = this.callback.bind(this);
  const proto = Object.getPrototypeOf(this);
  for (let key in { ...proto, ...this }) {
    if (typeof this[key] === "function") {
      cb[key] = this[key].bind(this);
    } else {
      cb[key] = this[key];
    }
  }
  return cb;
};

// #region Runtimes
// Node.js
server.prototype.node = async function () {
  const http = await import("http");
  http
    .createServer(async (request, response) => {
      try {
        const ctx = await createNodeContext(request, this.opts, this);
        const out = await handleRequest(this.handlers, ctx);

        response.writeHead(out.status || 200, parseHeaders(out.headers));
        if (out.body instanceof ReadableStream) {
          await iterate(out.body, (chunk) => response.write(chunk));
        } else {
          response.write(out.body || "");
        }
        response.end();
      } catch (error) {
        response.writeHead(error.status || 500);
        response.write(error.message || "");
        response.end();
      }
    })
    .listen(this.opts.port);
};

// Netlify
server.prototype.callback = async function (request, context) {
  // Consider simply renaming to "ctx.next()"
  request.context = context;
  try {
    if (typeof Netlify === "undefined") {
      throw new Error("Netlify doesn't exist");
    }
    const ctx = await createWinterContext(request, this.opts, this);
    return await handleRequest(this.handlers, ctx);
  } catch (error) {
    return new Response(error.message, { status: error.status || 500 });
  }
};

// WinterCG, Bun, Cloudflare Workers
server.prototype.fetch = async function (request, env) {
  if (env?.upgrade(request)) return;
  Object.assign(globalThis.env, env); // Extend env with the passed vars

  let ctx, res, error;
  try {
    ctx = await createWinterContext(request, this.opts, this);
    res = await handleRequest(this.handlers, ctx);
  } catch (err) {
    error = err;
    res = new Response(error.message, { status: error.status || 500 });
  }
  ctx?.unstableFire("finish", { ...ctx, error, res, end: performance.now() });
  return res;
};

// #region HTTP methods
// INTERNAL
server.prototype.handle = function (method, path, ...middleware) {
  // Do not try to optimize, we NEED the method to remain '*' here so that
  // it doesn't auto-finish
  if (method === "*") {
    for (let m in this.handlers) {
      this.handlers[m].push([method, path, ...middleware]);
    }
  } else {
    this.handlers[method].push([method, path, ...middleware]);
  }

  return this.self();
};

server.prototype.socket = function (path, ...middleware) {
  return this.handle("socket", path, ...middleware);
};

server.prototype.get = function (path, ...middleware) {
  return this.handle("get", path, ...middleware);
};

server.prototype.head = function (path, ...middleware) {
  return this.handle("head", path, ...middleware);
};

server.prototype.post = function (path, ...middleware) {
  return this.handle("post", path, ...middleware);
};

server.prototype.put = function (path, ...middleware) {
  return this.handle("put", path, ...middleware);
};

server.prototype.patch = function (path, ...middleware) {
  return this.handle("patch", path, ...middleware);
};

server.prototype.del = function (path, ...middleware) {
  return this.handle("del", path, ...middleware);
};

server.prototype.options = function (path, ...middleware) {
  return this.handle("options", path, ...middleware);
};

server.prototype.use = function (...middleware) {
  if (typeof middleware[0] === "string") {
    return this.handle("*", ...middleware);
  }
  return this.handle("*", "*", ...middleware);
};

// Unwind the children routers into the main router
server.prototype.router = function (basePath, router) {
  basePath = ("/" + basePath + "/").replace(/^\/+/, "/").replace(/\/+$/, "/");
  for (const method in router.handlers) {
    router.handlers[method].forEach(([method, path, ...callbacks]) => {
      this.handle(method, basePath + path.replace(/^\//, ""), ...callbacks);
    });
  }
  return this.self();
};

// #region Testing helper
server.prototype.test = function () {
  let cookie = "";
  const fetch = async (path, options = {}) => {
    if (!options.headers) options.headers = {};
    if (options.body && typeof options.body !== "string") {
      options.headers["content-type"] = "application/json; charset=utf-8";
      options.body = JSON.stringify(options.body);
    }
    if (cookie && !options.headers.cookie) {
      options.headers.cookie = cookie;
    }
    const res = await this.fetch(
      new Request("http://localhost:3000" + path, options),
    );

    const headers = parseHeaders(res.headers);
    let body;
    if (headers["set-cookie"]) {
      // TODO: this should really be a smart merge of the 2
      cookie = headers["set-cookie"];
    }
    if (headers["content-type"]?.includes("application/json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    return { status: res.status, headers, body };
  };
  return {
    app: this,
    get: (path, options) => fetch(path, { method: "get", ...options }),
    head: (path, options) => fetch(path, { method: "head", ...options }),
    post: (path, body, options) =>
      fetch(path, { method: "post", body, ...options }),
    put: (path, body, options) =>
      fetch(path, { method: "put", body, ...options }),
    patch: (path, body, options) =>
      fetch(path, { method: "patch", body, ...options }),
    delete: (path, options) => fetch(path, { method: "delete", ...options }),
    options: (path, options) => fetch(path, { method: "options", ...options }),
  };
};
