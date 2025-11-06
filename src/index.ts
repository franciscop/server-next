import "./polyfill.js";
// import "./errors/index.js";

import config from "./helpers/config";
// import { config, createWebsocket, getMachine } from "./helpers/index.js";

// import { assets, auth, timer, openapi } from "./middle/index.js";

import { Router } from "./router.js";
import ServerTest from "./ServerTest";
import * as handlers from "./context/handlers";
import { Settings } from "./types";

class Server extends Router {
  settings: Settings;

  constructor(options = {}) {
    super();

    // Keep a copy of the options in the instance
    this.settings = config(options);
    // this.platform = getMachine();

    // // For Bun and other WinterCG to know which port to serve from
    // if (this.settings.port) {
    //   this.port = this.settings.port;
    // }

    // this.sockets = []; // A reference of the currently connected sockets
    // this.websocket = createWebsocket(this.sockets, this.handlers); // Bun

    // // Initialize it right away for Node.js
    // if (this.platform.runtime === "node") {
    //   this.node();
    // }

    // // Middleware that is always available
    // this.use(timer);
    // this.use(assets);

    // // Optional middleware
    // if (this.settings.openapi) {
    //   this.get(this.settings.openapi.path || "/docs", openapi);
    // }
    // if (this.settings.auth) {
    //   this.use(auth({ options: this.settings, app: this }));
    // }
  }

  // We need to return a function; some environment expect the default export
  // to be a function that is called with the request, but we also want to
  // allow chaining, so we return a function that "extends" the instance
  self() {
    const cb = this.callback.bind(this);
    const proto = Object.getPrototypeOf(this);
    const keys = Object.keys({ ...this.handlers, ...proto, ...this });
    for (const key of ["use", ...keys]) {
      if (typeof this[key] === "function") {
        cb[key] = this[key].bind(this);
      } else {
        cb[key] = this[key];
      }
    }
    return cb;
  }

  // The different handlers for different platforms/runtimes
  node = handlers.Node;
  fetch = handlers.Winter;
  callback = handlers.Netlify;

  // Helper purely for testing
  test = ServerTest;
}

export default function server(options = {}) {
  return new Server(options).self();
}

export * from "./reply";
export { default as ServerError } from "./ServerError";
export { default as router } from "./router";
