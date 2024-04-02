type Bucket = {};

type Method =
  | "socket"
  | "get"
  | "head"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options";

type ServerOptions = {
  port?: number;
  views?: string | Bucket;
  public?: string | Bucket;
  uploads?: string | Bucket;
};

type Context = {
  method: Method;
  headers: { [key: string]: string | string[] };
  cookies: { [key: string]: any };
  body?: any;
  url: URL & { params: {}; query: {} };
  options: ServerOptions;
};

type Middleware = (ctx: Context) => any;

type Router = {};

declare interface Server {
  (options?: ServerOptions): this;

  socket(path: string, ...middleware: Middleware[]): this;
  get(path: string, ...middleware: Middleware[]): this;
  head(path: string, ...middleware: Middleware[]): this;
  post(path: string, ...middleware: Middleware[]): this;
  put(path: string, ...middleware: Middleware[]): this;
  patch(path: string, ...middleware: Middleware[]): this;
  del(path: string, ...middleware: Middleware[]): this;
  options(path: string, ...middleware: Middleware[]): this;

  use(...middleware: Middleware[]): this;
  router(router: Router): this;
}

declare const server: Server;
export default server;
