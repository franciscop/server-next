import "./errors/index";
import "./polyfill";

import { config, createWebsocket, getMachine } from "./helpers";
import {
  assets,
  auth,
  favicon,
  openapi,
  preflight,
  session,
  timer,
} from "./middle";

import * as handlers from "./context/handlers";
import { Router } from "./router";
import ServerTest from "./ServerTest";
import type {
  BunEnv,
  Options,
  Platform,
  ServerConfig,
  Settings,
} from "./types";

export class Server<O extends ServerConfig = {}> extends Router<O> {
  settings: Settings;
  platform: Platform;

  sockets: any[];
  websocket: any;

  // Lazily-loaded favicon bytes, cached per server until restart (see favicon
  // middleware). `undefined` = not loaded yet; `null` = configured but missing.
  faviconCache?: { bytes: Buffer; type: string; etag: string } | null;

  port?: number;

  constructor(options: Options = {}) {
    super();

    this.settings = config(options);
    this.platform = getMachine();

    if (this.settings.port) {
      this.port = this.settings.port;
    }

    this.sockets = [];
    this.websocket = createWebsocket(this.sockets, this.handlers);

    if (this.platform.runtime === "node") {
      this.node();
    } else if (this.platform.runtime === "bun") {
      // Bun serves the `export default` itself, so there's no listen callback to
      // hook, so log the startup banner here, since the port is already known.
      this.settings.log.start(`http://localhost:${this.settings.port}/`);
    }

    this.use(timer);
    if (this.settings.cors) this.use(preflight);
    this.use(assets);
    if (this.settings.favicon) this.get("/favicon.ico", favicon);
    this.use(session);

    if (this.settings.auth) {
      auth(this);
    }

    if (this.settings.openapi) {
      this.get(this.settings.openapi.path || "/docs", openapi as any);
    }
  }

  self(): this {
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

  node() {
    return handlers.Node(this);
  }
  fetch(request: Request, env?: BunEnv) {
    return handlers.Winter(this, request, env);
  }
  callback(request: Request, context: unknown) {
    return handlers.Netlify(this, request, context);
  }

  test() {
    return ServerTest(this);
  }
}

export default function server<
  Session extends Record<string, any> = {},
  User extends Record<string, any> = {},
>(options?: Options) {
  return new Server<ServerConfig<Session, User>>(options).self();
}

export * from "./reply";
export { default as router } from "./router";
export { default as ServerError } from "./ServerError";
export type * from "./types";
