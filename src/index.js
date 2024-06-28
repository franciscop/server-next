import "./polyfill.js";
// Define the errors for ServerError
import "./errors/index.js";

import Bucket from "./bucket.js";
import createNodeContext from "./context/node.js";
import createWinterContext from "./context/winter.js";
import {
  createId,
  getMachine,
  handleRequest,
  iterate,
} from "./helpers/index.js";
import middle from "./middle/index.js";

// Export the reply helpers
export * from "./reply.js";

export { default as ServerError } from "./ServerError.js";

// Allow to create a sub-router
export { default as router } from "./router.js";

const createNodeServer = async (app, options) => {
  const http = await import("http");
  http
    .createServer(async (request, response) => {
      try {
        const ctx = await createNodeContext(request, options, app);
        extendWithDefaults(ctx);
        const out = await handleRequest(app.handlers, ctx);

        response.writeHead(out.status || 200, out.headers);
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
    .listen(options.port);
};

const validateOptions = (options, env = {}) => {
  options.port = options.port || env.PORT || 3000;
  options.secret = options.secret || env.SECRET || "unsafe-" + createId();

  options.views = options.views ? Bucket(options.views) : null;
  options.public = options.public ? Bucket(options.public) : null;
  options.uploads = options.uploads ? Bucket(options.uploads) : null;

  options.store = options.store ?? null;
  options.cookies = options.cookies ?? {};
  if (options.store && options.cookies) {
    options.session = { store: options.store.prefix("session:") };
  }
  options.auth = options.auth || {};
  if (options.auth) {
    if (typeof options.auth !== "object") {
      options.auth = { type: options.auth };
    }
    if (!options.auth.store && options.store) {
      options.auth.store = options.store.prefix("auth:");
    }
  }

  return options;
};

const extendWithDefaults = (ctx) => {
  // Only want to execute it once; it needs to happen on a per-request
  // basis since we only have full access to the options there
  if (ctx.app.extended) return;
  middle(ctx);
  ctx.app.extended = true;
};

// Export the main server()
export default function server(options = {}) {
  if (!(this instanceof server)) {
    return new server(options);
  }

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

  this.extended = false;

  this.platform = getMachine();

  // WEBSOCKETS stuff
  const sockets = [];
  this.websocket = {
    message: async (socket, body) => {
      this.handlers.socket
        ?.filter((s) => s[0] === "message")
        ?.map((s) => s[1]({ socket, sockets, body }));
    },
    open: (ws) => sockets.push(ws),
    close: (ws) => sockets.splice(sockets.indexOf(ws), 1),
  };

  // Starting stuff
  if (this.platform.runtime === "node") {
    options = validateOptions(options, process.env);

    createNodeServer(this, options);
  }

  this.fetch = async (request, env, fetchCtx) => {
    if (env?.upgrade(request)) return;

    try {
      options = validateOptions(options, env);
      const ctx = await createWinterContext(request, options, this);
      extendWithDefaults(ctx);
      return await handleRequest(this.handlers, ctx);
    } catch (error) {
      return new Response(error.message, { status: error.status || 500 });
    }
  };
}

// INTERNAL
server.prototype.handle = function (method, path, ...middleware) {
  if (method === "*") {
    for (let m in this.handlers) {
      this.handlers[m].push([method, path, ...middleware]);
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
  basePath = ("/" + basePath + "/").replace(/^\/+/, "/").replace(/\/+$/, "/");
  for (const method in router.handlers) {
    router.handlers[method].forEach(([method, path, ...callbacks]) => {
      this.handle(method, basePath + path.replace(/^\//, ""), ...callbacks);
    });
  }
  return this;
};
