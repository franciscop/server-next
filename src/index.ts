import "./errors/index";
import "./polyfill";

import { config, createWebsocket, getMachine } from "./helpers";
import { assets, auth, openapi, session, timer } from "./middle";

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
    }

    this.use(timer);
    this.use(assets);
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
