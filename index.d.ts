type ServerOptions = {
  port?: number;
};
type Context = {
  body: {};
  headers: {};
  url: URL & { params: {}; query: {} };
};

type Middleware = (ctx: Context) => any;

type Router = {};

declare interface Server {
  (options?: ServerOptions): this;

  socket(url: string, ...middleware: Middleware[]): this;
  get(url: string, ...middleware: Middleware[]): this;
  head(url: string, ...middleware: Middleware[]): this;
  post(url: string, ...middleware: Middleware[]): this;
  put(url: string, ...middleware: Middleware[]): this;
  patch(url: string, ...middleware: Middleware[]): this;
  del(url: string, ...middleware: Middleware[]): this;
  options(url: string, ...middleware: Middleware[]): this;

  use(url: string, ...middleware: Middleware[]): this;
  router(router: Router): this;
}

declare const server: Server;
export default server;
