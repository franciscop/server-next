import type { Method, Middleware, RouterMethod, PathToParams } from "./types";

type PathOrMiddle = string | Middleware;
// This is "Method" and NOT "Method" on purpose
type FullRoute = [RouterMethod, string, ...Middleware[]][];

export class Router {
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
    path: PathOrMiddle,
    ...middleware: Middleware[]
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
    ...middleware: Middleware<PathToParams<Path>>[]
  ): this;
  socket(...middleware: Middleware[]): this;
  socket<Path extends string>(
    path: Path | Middleware,
    ...middleware: Middleware<PathToParams<Path>>[]
  ) {
    return this.handle("socket", path as any, ...middleware);
  }

  get<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>>[]
  ): this;
  get(...middleware: Middleware[]): this;
  get<Path extends string>(
    path: Path | Middleware,
    ...middleware: Middleware<PathToParams<Path>>[]
  ) {
    return this.handle("get", path as any, ...middleware);
  }

  head<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>>[]
  ): this;
  head(...middleware: Middleware[]): this;
  head<Path extends string>(
    path: Path | Middleware,
    ...middleware: Middleware<PathToParams<Path>>[]
  ) {
    return this.handle("head", path as any, ...middleware);
  }

  post<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>>[]
  ): this;
  post(...middleware: Middleware[]): this;
  post<Path extends string>(
    path: Path | Middleware,
    ...middleware: Middleware<PathToParams<Path>>[]
  ) {
    return this.handle("post", path as any, ...middleware);
  }

  put<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>>[]
  ): this;
  put(...middleware: Middleware[]): this;
  put<Path extends string>(
    path: Path | Middleware,
    ...middleware: Middleware<PathToParams<Path>>[]
  ) {
    return this.handle("put", path as any, ...middleware);
  }

  patch<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>>[]
  ): this;
  patch(...middleware: Middleware[]): this;
  patch<Path extends string>(
    path: Path | Middleware,
    ...middleware: Middleware<PathToParams<Path>>[]
  ) {
    return this.handle("patch", path as any, ...middleware);
  }

  del<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>>[]
  ): this;
  del(...middleware: Middleware[]): this;
  del<Path extends string>(
    path: Path | Middleware,
    ...middleware: Middleware<PathToParams<Path>>[]
  ) {
    return this.handle("delete", path as any, ...middleware);
  }

  options<Path extends string>(
    path: Path,
    ...middleware: Middleware<PathToParams<Path>>[]
  ): this;
  options(...middleware: Middleware[]): this;
  options<Path extends string>(
    path: Path | Middleware,
    ...middleware: Middleware<PathToParams<Path>>[]
  ) {
    return this.handle("options", path as any, ...middleware);
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
