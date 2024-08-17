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
  auth?: string | { type: string; provider: string };
};

type Context = {
  method: Method;
  headers: { [key: string]: string | string[] };
  cookies: { [key: string]: any };
  body?: any;
  url: URL & { params: {}; query: {} };
  options: ServerOptions;
};

type Body = string;

type ContentType = "application/json" | "text/plain" | (string & {});

// (src: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
type Headers = {
  "Cache-Control"?: string;
  "Content-Type"?: ContentType;
  Server?: string;
  "Set-Cookie"?: string;
  "Content-Length"?: string;
  Location?: string;

  "cache-control"?: string;
  "content-type"?: ContentType;
  server?: string;
  "set-cookie"?: string;
  "content-length"?: string;
  location?: string;

  [key: string]: string | undefined;
};

type InlineReply =
  | Response
  | { body: Body; headers?: Headers }
  | string
  | number
  | void;

type Middleware = (ctx: Context) => InlineReply;

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

type headers = (obj?: Headers) => any;

declare const server: Server;
export const headers: headers;
export default server;
