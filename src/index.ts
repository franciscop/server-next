import "./errors/index";
import "./polyfill";

import { config, createWebsocket, getMachine } from "./helpers";
import { assets, auth, openapi, timer } from "./middle/index";

import * as handlers from "./context/handlers";
import { Router } from "./router";
import ServerTest from "./ServerTest";
import type { BunEnv, Options, Platform, Settings } from "./types";

export class Server extends Router {
  settings: Settings;
  platform: Platform;

  sockets: any[];
  websocket: any;

  // Needed to be explicit for Bun/WinterCG
  port?: number;

  constructor(options: Options = {}) {
    super();

    // Keep a copy of the options in the instance
    this.settings = config(options);
    this.platform = getMachine();

    // For Bun and other WinterCG to know which port to serve from
    if (this.settings.port) {
      this.port = this.settings.port;
    }

    this.sockets = []; // A reference of the currently connected sockets
    this.websocket = createWebsocket(this.sockets, this.handlers); // Bun

    // Initialize it right away for Node.js
    if (this.platform.runtime === "node") {
      this.node();
    }

    // Middleware that is always available
    this.use(timer as any);
    this.use(assets as any);

    // Optional middleware
    if (this.settings.openapi) {
      this.get(this.settings.openapi.path || "/docs", openapi as any);
    }
    if (this.settings.auth) {
      this.use(auth as any);
    }
  }

  // We need to return a function; some environment expect the default export
  // to be a function that is called with the request, but we also want to
  // allow chaining, so we return a function that "extends" the instance
  self(): this & ((request: any, context?: any) => any) {
    const cb = this.callback.bind(this) as any;
    const proto = Object.getPrototypeOf(this);
    const keys = Object.keys({ ...this.handlers, ...proto, ...this });
    for (const key of ["use", "node", "fetch", "callback", "test", ...keys]) {
      if (typeof this[key] === "function") {
        cb[key] = (this as any)[key].bind(this);
      } else {
        cb[key] = (this as any)[key];
      }
    }
    return cb;
  }

  // The different handlers for different platforms/runtimes
  node() {
    return handlers.Node(this);
  }
  fetch(request: Request, env?: BunEnv) {
    return handlers.Winter(this, request, env);
  }
  callback(request: Request, context: unknown) {
    return handlers.Netlify(this, request, context);
  }

  // Helper purely for testing
  test() {
    return ServerTest(this);
  }
}

export default function server(options = {}) {
  return new Server(options).self();
}

export * from "./reply";
export { default as router } from "./router";
export { default as ServerError } from "./ServerError";
export type * from "./types";
