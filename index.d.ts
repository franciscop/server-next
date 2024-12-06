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

type ExtractPathParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractPathParams<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never;

type ParamsToObject<Params extends string> = {
  [K in Params as K extends `${infer Key}?`
    ? Key
    : K]: K extends `${infer Key}?` ? string | undefined : string;
};

type PathToParams<Path extends string> = ParamsToObject<
  ExtractPathParams<Path>
>;

type Simplify<T> = T extends object ? { [K in keyof T]: T[K] } : T;

type Context<Path extends string = string> = {
  method: Method;
  headers: { [key: string]: string | string[] };
  cookies: { [key: string]: any };
  body?: any;
  url: URL & {
    params: Simplify<PathToParams<Path>>; // Simplify here
    query: {};
  };
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

type Middleware<Path extends string = string> = (
  ctx: Context<Path>,
) => InlineReply;

declare interface Router {
  get<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  head<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  post<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  put<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  patch<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  del<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  options<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
}

declare interface Server {
  (options?: ServerOptions): this;

  socket(path: string, ...middle: Middleware[]): this;

  get<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  head<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  post<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  put<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  patch<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  del<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;
  options<Path extends string>(path: Path, ...middle: Middleware<Path>[]): this;

  use(...middle: Middleware[]): this;
  router(router: Router): this;
}

type headers = (obj?: Headers) => any;

declare const server: Server;
export const router: Router;
export const headers: headers;
export default server;
