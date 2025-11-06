import type { Method, Middleware, RouterMethod } from "./types";

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
  self() {
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

  socket(path: string, ...middleware: Middleware[]): this;
  socket(...middleware: Middleware[]): this;
  socket(path: string | Middleware, ...middleware: Middleware[]) {
    return this.handle("socket", path, ...middleware);
  }

  get(path: string, ...middleware: Middleware[]): this;
  get(...middleware: Middleware[]): this;
  get(path: string | Middleware, ...middleware: Middleware[]) {
    return this.handle("get", path, ...middleware);
  }

  head(path: string, ...middleware: Middleware[]): this;
  head(...middleware: Middleware[]): this;
  head(path: string | Middleware, ...middleware: Middleware[]) {
    return this.handle("head", path, ...middleware);
  }

  post(path: string, ...middleware: Middleware[]): this;
  post(...middleware: Middleware[]): this;
  post(path: string | Middleware, ...middleware: Middleware[]) {
    return this.handle("post", path, ...middleware);
  }

  put(path: string, ...middleware: Middleware[]): this;
  put(...middleware: Middleware[]): this;
  put(path: string | Middleware, ...middleware: Middleware[]) {
    return this.handle("put", path, ...middleware);
  }

  patch(path: string, ...middleware: Middleware[]): this;
  patch(...middleware: Middleware[]): this;
  patch(path: string | Middleware, ...middleware: Middleware[]) {
    return this.handle("patch", path, ...middleware);
  }

  del(path: string, ...middleware: Middleware[]): this;
  del(...middleware: Middleware[]): this;
  del(path: string | Middleware, ...middleware: Middleware[]) {
    return this.handle("delete", path, ...middleware);
  }

  options(path: string, ...middleware: Middleware[]): this;
  options(...middleware: Middleware[]): this;
  options(path: string | Middleware, ...middleware: Middleware[]) {
    return this.handle("options", path, ...middleware);
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
