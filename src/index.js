import "./polyfill.js";

import Bucket from "./bucket.js";
import createNodeContext from "./context/node.js";
import createWinterContext from "./context/winter.js";
import { getMachine, handleRequest, iterate } from "./helpers/index.js";

// Export the reply helpers
export * from "./reply.js";

// Allow to create a sub-router
export { default as router } from "./router.js";

// Export the main server()
export default function server(options = {}) {
  if (!(this instanceof server)) {
    return new server(options);
  }

  this.platform = getMachine();

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

  options.port = options.port || process.env.PORT || 3000;

  options.views = options.views ? Bucket(options.views) : null;
  options.public = options.public ? Bucket(options.public) : null;
  options.uploads = options.uploads ? Bucket(options.uploads) : null;

  this.options = options;

  // WEBSOCKETS stuff
  this.sockets = [];
  this.websocket = {
    message: async (ws, body) => {
      this.handlers.socket
        ?.filter((s) => s[0] === "message")
        ?.map((s) => s[1]({ socket: ws, sockets: this.sockets, body }));
    },
    open: (ws) => this.sockets.push(ws),
    close: (ws) => this.sockets.splice(this.sockets.indexOf(ws), 1),
  };

  if (this.platform.runtime === "node") {
    (async () => {
      const http = await import("http");
      http
        .createServer(async (request, response) => {
          const ctx = await createNodeContext(request, options);
          ctx.platform = this.platform;

          const out = await handleRequest(this.handlers, ctx);

          response.writeHead(out.status || 200, { header: out.headers });
          if (out.body instanceof ReadableStream) {
            await iterate(out.body, (chunk) => response.write(chunk));
          } else {
            response.write(out.body || "");
          }
          response.end();
        })
        .listen(options.port);
    })();
  }

  this.fetch = async (request, env, fetchCtx) => {
    if (env?.upgrade(request)) return;

    const ctx = await createWinterContext(request, options, this.platform);
    ctx.platform = this.platform;

    return await handleRequest(this.handlers, ctx);
  };
}

// INTERNAL
server.prototype.handle = function (method, path, ...middleware) {
  if (method === "*") {
    for (let m in this.handlers) {
      this.handlers[m].push(["*", path, ...middleware]);
    }
  } else {
    this.handlers[method].push([method, path, ...middleware]);
  }

  return this;
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

server.prototype.router = function (basePath, router) {
  basePath = "/" + basePath.replace(/^\//, "").replace(/\/$/, "") + "/";
  for (const method in router.handlers) {
    const handlers = router.handlers[method].map(([path, ...callbacks]) => [
      basePath + path.replace(/^\//, ""),
      ...callbacks,
    ]);
    this.handle(method, ...handlers);
  }
  return this;
};
