import type {
  Method,
  Middleware,
  PathToParams,
  RouteOptions,
  RouterMethod,
  ServerConfig,
} from "./types";

type PathOrMiddle<O extends ServerConfig = object> =
  | string
  | Middleware<any, O>;
// This is "Method" and NOT "Method" on purpose
type FullRoute = [RouterMethod, string, ...Middleware[]][];

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
    ...middleware: Middleware<any, O>[]
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

  socket<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  socket(...middleware: Middleware<any, O>[]): this;
  socket<Path extends string>(
    path: Path | Middleware<any, O>,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ) {
    return this.handle("socket", path as any, ...middleware);
  }

  get<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  get<Path extends string>(
    path: Path,
    options: RouteOptions,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  get(...middleware: Middleware<any, O>[]): this;
  get<Path extends string>(
    path: Path | Middleware<any, O>,
    optionsOrMiddleware?: RouteOptions | Middleware<PathToParams<Path>, O>,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ) {
    if (
      optionsOrMiddleware &&
      typeof optionsOrMiddleware === "object" &&
      !("length" in optionsOrMiddleware)
    ) {
      return this.handle("get", path as any, ...middleware);
    }
    return this.handle(
      "get",
      path as any,
      ...(optionsOrMiddleware
        ? [
            optionsOrMiddleware as Middleware<PathToParams<Path>, O>,
            ...middleware,
          ]
        : middleware),
    );
  }

  head<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  head<Path extends string>(
    path: Path,
    options: RouteOptions,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  head(...middleware: Middleware<any, O>[]): this;
  head<Path extends string>(
    path: Path | Middleware<any, O>,
    optionsOrMiddleware?: RouteOptions | Middleware<PathToParams<Path>, O>,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ) {
    if (
      optionsOrMiddleware &&
      typeof optionsOrMiddleware === "object" &&
      !("length" in optionsOrMiddleware)
    ) {
      return this.handle("head", path as any, ...middleware);
    }
    return this.handle(
      "head",
      path as any,
      ...(optionsOrMiddleware
        ? [
            optionsOrMiddleware as Middleware<PathToParams<Path>, O>,
            ...middleware,
          ]
        : middleware),
    );
  }

  post<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  post<Path extends string>(
    path: Path,
    options: RouteOptions,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  post(...middleware: Middleware<any, O>[]): this;
  post<Path extends string>(
    path: Path | Middleware<any, O>,
    optionsOrMiddleware?: RouteOptions | Middleware<PathToParams<Path>, O>,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ) {
    // If second argument is an options object, skip it for now
    // (it would be used for OpenAPI docs generation)
    if (
      optionsOrMiddleware &&
      typeof optionsOrMiddleware === "object" &&
      !("length" in optionsOrMiddleware)
    ) {
      // It's RouteOptions, just pass through the middleware
      return this.handle("post", path as any, ...middleware);
    }
    // Otherwise, it's middleware
    return this.handle(
      "post",
      path as any,
      ...(optionsOrMiddleware
        ? [
            optionsOrMiddleware as Middleware<PathToParams<Path>, O>,
            ...middleware,
          ]
        : middleware),
    );
  }

  put<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  put<Path extends string>(
    path: Path,
    options: RouteOptions,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  put(...middleware: Middleware<any, O>[]): this;
  put<Path extends string>(
    path: Path | Middleware<any, O>,
    optionsOrMiddleware?: RouteOptions | Middleware<PathToParams<Path>, O>,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ) {
    if (
      optionsOrMiddleware &&
      typeof optionsOrMiddleware === "object" &&
      !("length" in optionsOrMiddleware)
    ) {
      return this.handle("put", path as any, ...middleware);
    }
    return this.handle(
      "put",
      path as any,
      ...(optionsOrMiddleware
        ? [
            optionsOrMiddleware as Middleware<PathToParams<Path>, O>,
            ...middleware,
          ]
        : middleware),
    );
  }

  patch<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  patch<Path extends string>(
    path: Path,
    options: RouteOptions,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  patch(...middleware: Middleware<any, O>[]): this;
  patch<Path extends string>(
    path: Path | Middleware<any, O>,
    optionsOrMiddleware?: RouteOptions | Middleware<PathToParams<Path>, O>,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ) {
    if (
      optionsOrMiddleware &&
      typeof optionsOrMiddleware === "object" &&
      !("length" in optionsOrMiddleware)
    ) {
      return this.handle("patch", path as any, ...middleware);
    }
    return this.handle(
      "patch",
      path as any,
      ...(optionsOrMiddleware
        ? [
            optionsOrMiddleware as Middleware<PathToParams<Path>, O>,
            ...middleware,
          ]
        : middleware),
    );
  }

  del<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  del<Path extends string>(
    path: Path,
    options: RouteOptions,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  del(...middleware: Middleware<any, O>[]): this;
  del<Path extends string>(
    path: Path | Middleware<any, O>,
    optionsOrMiddleware?: RouteOptions | Middleware<PathToParams<Path>, O>,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ) {
    if (
      optionsOrMiddleware &&
      typeof optionsOrMiddleware === "object" &&
      !("length" in optionsOrMiddleware)
    ) {
      return this.handle("delete", path as any, ...middleware);
    }
    return this.handle(
      "delete",
      path as any,
      ...(optionsOrMiddleware
        ? [
            optionsOrMiddleware as Middleware<PathToParams<Path>, O>,
            ...middleware,
          ]
        : middleware),
    );
  }

  options<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  options<Path extends string>(
    path: Path,
    options: RouteOptions,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ): this;
  options(...middleware: Middleware<any, O>[]): this;
  options<Path extends string>(
    path: Path | Middleware<any, O>,
    optionsOrMiddleware?: RouteOptions | Middleware<PathToParams<Path>, O>,
    ...middleware: Middleware<PathToParams<Path>, O>[]
  ) {
    if (
      optionsOrMiddleware &&
      typeof optionsOrMiddleware === "object" &&
      !("length" in optionsOrMiddleware)
    ) {
      return this.handle("options", path as any, ...middleware);
    }
    return this.handle(
      "options",
      path as any,
      ...(optionsOrMiddleware
        ? [
            optionsOrMiddleware as Middleware<PathToParams<Path>, O>,
            ...middleware,
          ]
        : middleware),
    );
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
