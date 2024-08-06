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
  parseHeaders,
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
    .listen(options.port);
};

const validateOptions = (options, env = {}) => {
  options.port = options.port || env.PORT || 3000;
  options.secret = options.secret || env.SECRET || "unsafe-" + createId();
  options.cors = options.cors || env.CORS || null;
  if (options.cors === true) {
    options.cors = { origin: options.domain || "*" };
  }
  if (typeof options.cors === "string") {
    options.cors = { origin: options.cors };
  }
  if (options.cors && !options.cors.methods) {
    options.cors.methods = "GET,HEAD,POST,PUT,PATCH";
  }

  options.views = options.views ? Bucket(options.views) : null;
  options.public = options.public ? Bucket(options.public) : null;
  options.uploads = options.uploads ? Bucket(options.uploads) : null;

  options.store = options.store ?? null;
  options.cookies = options.cookies ?? {};
  if (options.store && options.cookies) {
    options.session = { store: options.store.prefix("session:") };
  }

  // AUTH
  options.auth = options.auth || env.AUTH || null;
  if (options.auth) {
    if (typeof options.auth !== "object") {
      const [type, provider] = options.auth.split(":");
      options.auth = { type, provider };
    }
    if (typeof options.auth.provider === "string") {
      options.auth.provider === options.auth.provider.split("|");
    }
    if (!options.auth.type) {
      throw new Error("Auth options needs a type");
    }
    if (!options.auth.provider) {
      throw new Error("Auth options needs a provider");
    }
    if (!options.auth.session && options.store) {
      options.auth.session = options.store.prefix("auth:");
    }
    if (!options.auth.store && options.store) {
      options.auth.store = options.store.prefix("user:");
    }
    if (!options.auth.cleanUser) {
      options.auth.cleanUser = (fullUser) => {
        const { password, ...user } = fullUser;
        return user;
      };
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
  // Make it so that the exported one is a prototype of function()
  if (!(this instanceof server)) {
    return new server(options).self();
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

  this.netlify = async (request) => {
    if (typeof Netlify === "undefined") throw new Error("Unknown");
    console.log("Experimental Netlify");
    try {
      options = validateOptions(options, Netlify.env.toObject());
      const ctx = await createWinterContext(request, options, this);
      extendWithDefaults(ctx);
      return await handleRequest(this.handlers, ctx);
    } catch (error) {
      console.error(error);
      return new Response(error.message, { status: error.status || 500 });
    }
  };
}

server.prototype.self = function () {
  const cb = this.netlify;
  const keys = Object.keys(Object.getPrototypeOf(this)).concat(
    Object.keys(this)
  );
  keys.forEach((key) => {
    cb[key] = this[key];
  });
  return cb;
};

// INTERNAL
server.prototype.handle = function (method, path, ...middleware) {
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

server.prototype.router = function (basePath, router) {
  basePath = ("/" + basePath + "/").replace(/^\/+/, "/").replace(/\/+$/, "/");
  for (const method in router.handlers) {
    router.handlers[method].forEach(([method, path, ...callbacks]) => {
      this.handle(method, basePath + path.replace(/^\//, ""), ...callbacks);
    });
  }
  return this.self();
};

server.prototype.test = function () {
  let cookie = "";
  const fetch = async (path, options = {}) => {
    if (!options.headers) options.headers = {};
    if (options.body && typeof options.body !== "string") {
      options.headers["content-type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    if (cookie && !options.headers.cookie) {
      options.headers.cookie = cookie;
    }
    const res = await this.fetch(
      new Request("http://localhost:3000" + path, options)
    );

    const headers = parseHeaders(res.headers);
    let data;
    if (headers["set-cookie"]) {
      // TODO: this should really be a smart merge of the 2
      cookie = headers["set-cookie"];
    }
    if (headers["content-type"]?.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, headers, data };
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
