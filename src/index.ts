import "./errors/index";
import "./polyfill";

import { config, createWebsocket, getMachine } from "./helpers";
import { assets, auth, openapi, preflight, timer } from "./middle";

import * as handlers from "./context/handlers";
import { Router } from "./router";
import ServerTest from "./ServerTest";
import type {
  AuthConfig,
  AuthFunction,
  AuthOption,
  AuthProfile,
  AuthClaims,
  AuthVerify,
  BunEnv,
  ContextTypes,
  Options,
  Platform,
  Settings,
  UserOf,
} from "./types";

export class Server<C extends ContextTypes = {}> extends Router<C> {
  settings: Settings;
  platform: Platform;

  sockets: WebSocket[];
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
    } else if (this.platform.runtime === "bun") {
      // Bun serves the `export default` itself, so there's no listen callback to
      // hook, so log the startup banner here, since the port is already known.
      this.settings.log.start(`http://localhost:${this.settings.port}/`);
    }

    // Framework middleware is written against the untyped `Server`; `C` is
    // only known at the app's call site, so the wiring goes through this view.
    const app = this as unknown as Server;
    app.use(timer);
    if (this.settings.cors) app.use(preflight);
    app.use(assets);

    if (this.settings.auth) {
      auth(app);
    }

    if (this.settings.openapi) {
      app.get(this.settings.openapi.path, openapi as any);
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
    return handlers.Node(this as unknown as Server);
  }
  fetch(request: Request, env?: BunEnv) {
    return handlers.Winter(this as unknown as Server, request, env);
  }
  callback(request: Request, context: unknown) {
    return handlers.Netlify(this as unknown as Server, request, context);
  }

  test() {
    return ServerTest(this as unknown as Server);
  }
}

// `ctx.user` is whatever the configured `auth` produces, so an app never
// declares a User type. Each shape has its own rule, hence the overloads: the
// user comes from `getUser` when there is one, and otherwise from what the
// credential carries (a profile for a login flow, the claims for `verify`).
// Declaring the generic explicitly still wins, for router-per-file apps.
export default function server<U = AuthProfile>(
  options: Omit<Options, "auth"> & { auth: AuthConfig<U> },
): Server<{ user: U }>;
export default function server(
  options: Omit<Options, "auth"> & { auth: string },
): Server<{ user: AuthProfile }>;
export default function server<U = AuthClaims>(
  options: Omit<Options, "auth"> & { auth: AuthVerify<U> },
): Server<{ user: U }>;
export default function server<U>(
  options: Omit<Options, "auth"> & { auth: AuthFunction<U> },
): Server<{ user: NonNullable<Awaited<U>> }>;
export default function server<A extends readonly AuthOption[]>(
  options: Omit<Options, "auth"> & { auth: A },
): Server<{ user: UserOf<A[number]> }>;
export default function server<C extends ContextTypes = {}>(
  options?: Options,
): Server<C>;
export default function server(options?: Options) {
  return new Server(options).self();
}


export * from "./reply";
export { default as router } from "./router";
export { default as ServerError } from "./ServerError";
export { default as ValidationError } from "./errors/ValidationError";
export type * from "./types";

// The file-storage library, re-exported so there's nothing extra to install:
// `bucket` holds the storage providers (`bucket.FS`, `bucket.S3`, ...).
export { default as bucket } from "bucket";
