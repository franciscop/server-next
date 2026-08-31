import type {
  Context,
  ContextTypes,
  Method,
  Middleware,
  RouteOptions as Options,
  PathToParams,
  Route,
  Settings,
  StandardSchemaV1,
} from "./types";
import { resolveUploads } from "./body/upload";

// Middleware spelled out structurally: comparing Middleware<A> to
// Middleware<B> uses alias variance (invariant here), rejecting smaller slices
type Fn<C extends ContextTypes> = (ctx: Context<C>) => ReturnType<Middleware>;

// One route's ctx: the app generic's session/user plus the route's own params
// and schemas (a `params` schema overrides the path-derived params)
type RouteCtx<C extends ContextTypes, RO extends Options, Params> = Omit<
  C,
  "params" | "query" | "body"
> & {
  params: [RO["params"]] extends [StandardSchemaV1<any, any>]
    ? RO["params"]
    : Params;
} & Pick<RO, keyof RO & ("query" | "body")>;

// The middleware for a route: params typed from the path, and (when an options
// object with schemas sits in between) ctx.body/query/params typed from them
type Mids<
  C extends ContextTypes,
  Path extends string,
  RO extends Options = {},
> = Fn<RouteCtx<C, RO, PathToParams<Path>>>[];

// Flags unknown route-option keys (`cachee`) at the exact key; the generic
// capture of RO would otherwise skip excess-property checking and accept them
type Exact<RO> = Options & { [K in Exclude<keyof RO, keyof Options>]: never };

// A raw/stream route never parses the body, so a `body` schema is a mistake,
// caught at boot (bare Routers have no settings, hence the .use() recheck)
function checkParserConflict(options: Options, globalParser?: string): void {
  const parser = options.parser ?? globalParser ?? "parse";
  if (options.body && parser !== "parse") {
    throw new Error(
      `A \`parser: '${parser}'\` route never parses the body, so its \`body\` ` +
        `schema cannot run. Remove one, or set \`parser: 'parse'\` on the route.`,
    );
  }
}

export class Router<C extends ContextTypes = {}> {
  // Assigned by the Server subclass; a bare router has none. Declared here so
  // route registration can check options against the global config.
  protected settings?: Settings;

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
    checkParserConflict(options, this.settings?.parser);
    // Resolved here (once, at boot) so ctx.options.uploads is always the
    // final `{ bucket, ...limits }` shape no matter where it came from
    if (options.uploads !== undefined) {
      options.uploads = resolveUploads(options.uploads) as any;
    }

    // Sockets are dispatched on their own and don't run the HTTP middleware
    const base = method === "socket" ? [] : this.middleware;
    const fns = [...base, ...rest].filter((fn) => fn != null);

    // `uploads` was just resolved above, hence the stored-route shape
    this.handlers[method].push({ path, options: options as Route["options"], fns });
    return this.self();
  }

  socket<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
  socket(...middleware: Fn<C>[]): this;
  socket<RO extends Exact<RO>>(
    options: RO,
    ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]
  ): this;
  socket<Path extends string, RO extends Exact<RO>>(
    path: Path,
    options: RO,
    ...middleware: Mids<C, Path, RO>
  ): this;
  socket(pathOrMid?: any, optionsOrMid?: any, ...middleware: any[]) {
    return this.handle("socket", pathOrMid, optionsOrMid, ...middleware);
  }

  get<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
  get(...middleware: Fn<C>[]): this;
  get<RO extends Exact<RO>>(
    options: RO,
    ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]
  ): this;
  get<Path extends string, RO extends Exact<RO>>(
    path: Path,
    options: RO,
    ...middleware: Mids<C, Path, RO>
  ): this;
  get(pathOrMid?: any, optionsOrMid?: any, ...middleware: any[]) {
    return this.handle("get", pathOrMid, optionsOrMid, ...middleware);
  }

  head<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
  head(...middleware: Fn<C>[]): this;
  head<RO extends Exact<RO>>(
    options: RO,
    ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]
  ): this;
  head<Path extends string, RO extends Exact<RO>>(
    path: Path,
    options: RO,
    ...middleware: Mids<C, Path, RO>
  ): this;
  head(pathOrMid?: any, optionsOrMid?: any, ...middleware: any[]) {
    return this.handle("head", pathOrMid, optionsOrMid, ...middleware);
  }

  post<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
  post(...middleware: Fn<C>[]): this;
  post<RO extends Exact<RO>>(
    options: RO,
    ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]
  ): this;
  post<Path extends string, RO extends Exact<RO>>(
    path: Path,
    options: RO,
    ...middleware: Mids<C, Path, RO>
  ): this;
  post(pathOrMid?: any, optionsOrMid?: any, ...middleware: any[]) {
    return this.handle("post", pathOrMid, optionsOrMid, ...middleware);
  }

  put<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
  put(...middleware: Fn<C>[]): this;
  put<RO extends Exact<RO>>(
    options: RO,
    ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]
  ): this;
  put<Path extends string, RO extends Exact<RO>>(
    path: Path,
    options: RO,
    ...middleware: Mids<C, Path, RO>
  ): this;
  put(pathOrMid?: any, optionsOrMid?: any, ...middleware: any[]) {
    return this.handle("put", pathOrMid, optionsOrMid, ...middleware);
  }

  patch<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
  patch(...middleware: Fn<C>[]): this;
  patch<RO extends Exact<RO>>(
    options: RO,
    ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]
  ): this;
  patch<Path extends string, RO extends Exact<RO>>(
    path: Path,
    options: RO,
    ...middleware: Mids<C, Path, RO>
  ): this;
  patch(pathOrMid?: any, optionsOrMid?: any, ...middleware: any[]) {
    return this.handle("patch", pathOrMid, optionsOrMid, ...middleware);
  }

  delete<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
  delete(...middleware: Fn<C>[]): this;
  delete<RO extends Exact<RO>>(
    options: RO,
    ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]
  ): this;
  delete<Path extends string, RO extends Exact<RO>>(
    path: Path,
    options: RO,
    ...middleware: Mids<C, Path, RO>
  ): this;
  delete(pathOrMid?: any, optionsOrMid?: any, ...middleware: any[]) {
    return this.handle("delete", pathOrMid, optionsOrMid, ...middleware);
  }

  options<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
  options(...middleware: Fn<C>[]): this;
  options<RO extends Exact<RO>>(
    options: RO,
    ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]
  ): this;
  options<Path extends string, RO extends Exact<RO>>(
    path: Path,
    options: RO,
    ...mid: Mids<C, Path, RO>
  ): this;
  options(pathOrMid?: any, optionsOrMid?: any, ...middleware: any[]) {
    return this.handle("options", pathOrMid, optionsOrMid, ...middleware);
  }

  // .use() takes cross-cutting middleware or a whole router to merge in. It does
  // NOT take a path: to scope a middleware to some paths, check ctx.url.pathname
  // inside it, put it on its own router, or repeat it on the routes.
  use(...middleware: Fn<C>[]): this;
  use(router: Router<any>): this;
  use(...args: any[]) {
    for (const arg of args) {
      if (arg instanceof Router) {
        // Merge the router's routes at the root, prepending our middleware
        for (const m of Object.keys(arg.handlers) as Method[]) {
          for (const route of arg.handlers[m]) {
            // The router's routes now meet the server's global parser default
            checkParserConflict(route.options, this.settings?.parser);
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

export default function router<C extends ContextTypes = {}>(): Router<C> {
  return new Router<C>();
}
