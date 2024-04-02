declare module "server" {
  type ServerOptions = {
    port?: number;
  };
  type Context = {
    body: {};
    headers: {};
    url: URL & { params: {}; query: {} };
  };

  type Middleware = (ctx: Context) => any;

  export interface Server {
    new (options?: ServerOptions): this;

    get(url: string, ...middleware: Middleware[]): this;
  }

  const server: Server;
  export default server;
}
