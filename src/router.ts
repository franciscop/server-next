import type {
  Method,
  Middleware,
  RouteOptions as Options,
  PathToParams,
  RouterMethod,
  ServerConfig,
} from "./types";

type Mids<O, Path extends string> = Middleware<O, PathToParams<Path>>[];

type PathOrMiddle<O extends ServerConfig = object> = string | Middleware<O>;
// This is "Method" and NOT "Method" on purpose
type FullRoute = [RouterMethod, string, ...Middleware[]][];

function isMiddleware<O>(x: unknown): x is Middleware<O> {
  return typeof x === "function";
}

export class Router<O extends ServerConfig = object> {
  handlers: Record<Method, FullRoute> = {
    socket: [],
    get: [],
    head: [],
    post: [],
    put: [],
    patch: [],
    delete: [],
    options: [],
  };

  // For the router we can just return itself since it's not the final export,
  // but then on the root it'll return some fancy wrappers
  self(): this {
    return this;
  }

  handle(
    method: RouterMethod,
    path: PathOrMiddle<O>,
    ...middleware: Middleware<O>[]
  ) {
    // If there's not path and it's just anothe middleware, add it and shift it
    if (typeof path !== "string") {
      middleware.unshift(path);
      path = "*";
    }

    // Do not try to optimize, we NEED the method to remain '*' here so that
    // it doesn't auto-close the request
    const methods =
      method === "*" ? (Object.keys(this.handlers) as Method[]) : [method];
    for (const m of methods) {
      this.handlers[m].push([method, path, ...middleware]);
    }

    return this.self();
  }

  socket<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  socket<Path extends string>(
    path: Path,
    options: Options,
    ...middleware: Mids<O, Path>
  ): this;
  socket(...middleware: Middleware<O>[]): this;
  socket(options: Options, ...middleware: Middleware<O>[]): this;
  socket<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    if (typeof pathOrMid === "string" && isMiddleware(optionsOrMid)) {
      return this.handle("socket", pathOrMid, optionsOrMid, ...middleware);
    }
    return this.handle("socket", pathOrMid, ...middleware);
  }

  get<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  get<Path extends string>(
    path: Path,
    options: Options,
    ...middleware: Mids<O, Path>
  ): this;
  get(...middleware: Middleware<O>[]): this;
  get(options: Options, ...middleware: Middleware<O>[]): this;
  get<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    if (typeof pathOrMid === "string" && isMiddleware(optionsOrMid)) {
      return this.handle("get", pathOrMid, optionsOrMid, ...middleware);
    }

    return this.handle("get", pathOrMid, ...middleware);
  }

  head<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  head<Path extends string>(
    path: Path,
    options: Options,
    ...middleware: Mids<O, Path>
  ): this;
  head(...middleware: Middleware<O>[]): this;
  head(options: Options, ...middleware: Middleware<O>[]): this;
  head<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    if (typeof pathOrMid === "string" && isMiddleware(optionsOrMid)) {
      return this.handle("head", pathOrMid, optionsOrMid, ...middleware);
    }

    return this.handle("head", pathOrMid, ...middleware);
  }

  post<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  post<Path extends string>(
    path: Path,
    options: Options,
    ...middleware: Mids<O, Path>
  ): this;
  post(...middleware: Middleware<O>[]): this;
  post(options: Options, ...middleware: Middleware<O>[]): this;
  post<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    if (typeof pathOrMid === "string" && isMiddleware(optionsOrMid)) {
      return this.handle("post", pathOrMid, optionsOrMid, ...middleware);
    }

    return this.handle("post", pathOrMid, ...middleware);
  }

  put<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  put<Path extends string>(
    path: Path,
    options: Options,
    ...middleware: Mids<O, Path>
  ): this;
  put(...middleware: Middleware<O>[]): this;
  put(options: Options, ...middleware: Middleware<O>[]): this;
  put<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    if (typeof pathOrMid === "string" && isMiddleware(optionsOrMid)) {
      return this.handle("put", pathOrMid, optionsOrMid, ...middleware);
    }

    return this.handle("put", pathOrMid, ...middleware);
  }

  patch<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  patch<Path extends string>(
    path: Path,
    options: Options,
    ...middleware: Mids<O, Path>
  ): this;
  patch(...middleware: Middleware<O>[]): this;
  patch(options: Options, ...middleware: Middleware<O>[]): this;
  patch<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    if (typeof pathOrMid === "string" && isMiddleware(optionsOrMid)) {
      return this.handle("patch", pathOrMid, optionsOrMid, ...middleware);
    }

    return this.handle("patch", pathOrMid, ...middleware);
  }

  del<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  del<Path extends string>(
    path: Path,
    options: Options,
    ...middleware: Mids<O, Path>
  ): this;
  del(...middleware: Middleware<O>[]): this;
  del(options: Options, ...middleware: Middleware<O>[]): this;
  del<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    if (typeof pathOrMid === "string" && isMiddleware(optionsOrMid)) {
      return this.handle("delete", pathOrMid, optionsOrMid, ...middleware);
    }

    return this.handle("delete", pathOrMid, ...middleware);
  }

  options<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  options<Path extends string>(
    path: Path,
    options: Options,
    ...mid: Mids<O, Path>
  ): this;
  options(...middleware: Middleware<O>[]): this;
  options(options: Options, ...middleware: Middleware<O>[]): this;
  options<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    if (typeof pathOrMid === "string" && isMiddleware(optionsOrMid)) {
      return this.handle("options", pathOrMid, optionsOrMid, ...middleware);
    }

    return this.handle("options", pathOrMid, ...middleware);
  }

  use(...middleware: Middleware[]): this;
  use(path: string, ...middleware: Middleware[]): this;
  use(router: Router): this;
  use(path: string, router: Router): this;
  use(...args: [string | Router | Middleware, ...(Router | Middleware)[]]) {
    // .use('/', router) or .use('/', mid1, mid2)
    const path = (typeof args[0] === "string" ? args.shift() : "*") as string;

    // .use(router), need to bring the methods in
    if (args[0] instanceof Router) {
      // Create a base path like `/users/` so that we can concatenate later on
      const basePath = `/${path.replace(/\*$/, "")}/`
        .replace(/^\/+/, "/")
        .replace(/\/+$/, "/");
      const handlers = args[0].handlers;
      for (const m in handlers) {
        for (const [method, path, ...middleware] of handlers[m as Method]) {
          const fullPath = basePath + path.replace(/^\//, "");
          this.handlers[m as Method].push([method, fullPath, ...middleware]);
        }
      }
      return this.self();
    }

    // .use(mid1, mid2)
    return this.handle("*", path, ...(args as Middleware[]));
  }
}

export default function router(): Router {
  return new Router();
}
