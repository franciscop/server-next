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

    return this;
  }

  socket(path: PathOrMiddle, ...middleware: Middleware[]) {
    return this.handle("socket", path, ...middleware);
  }

  get(path: PathOrMiddle, ...middleware: Middleware[]) {
    return this.handle("get", path, ...middleware);
  }

  head(path: PathOrMiddle, ...middleware: Middleware[]) {
    return this.handle("head", path, ...middleware);
  }

  post(path: PathOrMiddle, ...middleware: Middleware[]) {
    return this.handle("post", path, ...middleware);
  }

  put(path: PathOrMiddle, ...middleware: Middleware[]) {
    return this.handle("put", path, ...middleware);
  }

  patch(path: PathOrMiddle, ...middleware: Middleware[]) {
    return this.handle("patch", path, ...middleware);
  }

  del(path: PathOrMiddle, ...middleware: Middleware[]) {
    return this.handle("delete", path, ...middleware);
  }

  options(path: PathOrMiddle, ...middleware: Middleware[]) {
    return this.handle("options", path, ...middleware);
  }

  use(...middleware: Middleware[]): void;
  use(path: string, ...middleware: Middleware[]): void;
  use(router: Router): void;
  use(path: string, router: Router): void;
  use(...args: [string | Router | Middleware, ...(Router | Middleware)[]]) {
    // .use('/', router) or .use('/', mid1, mid2)
    const path = (typeof args[0] === "string" ? args.shift() : "*") as string;

    // .use(router)
    if (args[0] instanceof Router) {
      const basePath = `/${path.replace(/\*$/, "")}/`
        .replace(/^\/+/, "/")
        .replace(/\/+$/, "/");
      for (const m in args[0].handlers) {
        for (const [method, path, ...middleware] of args[0].handlers[m]) {
          const fullPath = basePath + path.replace(/^\//, "");
          this.handlers[m].push([method, fullPath, ...middleware]);
          // this.handle(method, fullPath, ...(middleware as Middleware[]));
        }
      }
      return this;
    }

    // .use(mid1, mid2)
    return this.handle("*", path, ...(args as Middleware[]));
  }
}

export default function router(): Router {
  return new Router();
}
