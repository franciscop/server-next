import type {
  Method,
  Middleware,
  RouteOptions as Options,
  PathToParams,
  Route,
  ServerConfig,
} from "./types";

type Mids<O extends ServerConfig, Path extends string> = Middleware<
  O,
  PathToParams<Path>
>[];

export class Router<O extends ServerConfig = object> {
  // Cross-cutting middleware added with .use(); they run on every request
  middleware: Middleware[] = [];

  // Routes per method, each carrying its own (already-flattened) chain of fns
  handlers: Record<Method, Route[]> = {
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

  // Registers one route: bakes the current middleware + the route's own
  // functions into a single flat `fns` list. A plain options object may sit
  // between the path and the handlers, and it's pulled out here.
  handle(method: Method, pathOrFn?: any, ...rest: any[]) {
    let path = "*";
    if (typeof pathOrFn === "string") {
      path = pathOrFn;
    } else if (pathOrFn != null) {
      rest.unshift(pathOrFn);
    }

    let options: Options = {};
    if (rest[0] != null && typeof rest[0] !== "function") {
      options = rest.shift();
    }

    // Sockets are dispatched on their own and don't run the HTTP middleware
    const base = method === "socket" ? [] : this.middleware;
    const fns = [...base, ...rest].filter((fn) => fn != null);

    this.handlers[method].push({ path, options, fns });
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
    return this.handle("socket", pathOrMid, optionsOrMid, ...middleware);
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
    return this.handle("get", pathOrMid, optionsOrMid, ...middleware);
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
    return this.handle("head", pathOrMid, optionsOrMid, ...middleware);
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
    return this.handle("post", pathOrMid, optionsOrMid, ...middleware);
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
    return this.handle("put", pathOrMid, optionsOrMid, ...middleware);
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
    return this.handle("patch", pathOrMid, optionsOrMid, ...middleware);
  }

  delete<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
  delete<Path extends string>(
    path: Path,
    options: Options,
    ...middleware: Mids<O, Path>
  ): this;
  delete(...middleware: Middleware<O>[]): this;
  delete(options: Options, ...middleware: Middleware<O>[]): this;
  delete<Path extends string>(
    pathOrMid: Path | Middleware<O>,
    optionsOrMid?: Options | Middleware<O>,
    ...middleware: Middleware<O>[]
  ) {
    return this.handle("delete", pathOrMid, optionsOrMid, ...middleware);
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
    return this.handle("options", pathOrMid, optionsOrMid, ...middleware);
  }

  // .use() takes cross-cutting middleware or a whole router to merge in. It does
  // NOT take a path: to scope a middleware to some paths, check ctx.url.pathname
  // inside it, put it on its own router, or repeat it on the routes.
  use(...middleware: Middleware[]): this;
  use(router: Router): this;
  use(...args: (Middleware | Router)[]) {
    for (const arg of args) {
      if (arg instanceof Router) {
        // Merge the router's routes at the root, prepending our middleware
        for (const m of Object.keys(arg.handlers) as Method[]) {
          for (const route of arg.handlers[m]) {
            const base = m === "socket" ? [] : this.middleware;
            this.handlers[m].push({
              path: route.path,
              options: route.options,
              fns: [...base, ...route.fns],
            });
          }
        }
      } else {
        this.middleware.push(arg);
      }
    }
    return this.self();
  }
}

export default function router(): Router {
  return new Router();
}
