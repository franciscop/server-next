type Method =
  | "socket"
  | "get"
  | "head"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options";

type Store = {
  get: (key: string) => Promise<any>;
  set: (
    key: string,
    value: any,
    { expires }?: { expires?: string | number },
  ) => Promise<any>;
};

type Bucket = any;

type Auth = {
  type: "cookie" | "token";
  provider: "github" | "email";
};
type AuthString = `${Auth["type"]}:${Auth["provider"]}`;

type Domain = `https://${string}/`;
type Origin = boolean | "*" | Domain | Domain[];
type Cors = {
  origin: Origin;
  methods: string;
  headers: string;
  credentials?: boolean;
};

type ServerOptions = {
  port?: number;
  views?: string | Bucket;
  public?: string | Bucket;
  uploads?: string | Bucket;
  cors?: boolean | Origin | Cors;
  auth?: AuthString | Auth;
  store?: Store;
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
    query: { [key: string]: string };
  };
  options: ServerOptions;
};

type Body = string;

type ContentType = "application/json" | "text/plain" | (string & {});

// (src: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
type Headers = {
  "cache-control"?: string;
  "content-type"?: ContentType;
  "set-cookie"?: string;
  "content-length"?: string;
  server?: string;
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
  /**
   * Launch the server with the optional configuration:
   *
   * ```js
   * export default server({
   *   port: 3000,
   *   public: './public',
   *   store: kv(new Map()),
   * })
   * ```
   *
   * **[→ Getting Started](https://react-test.dev/documentation#attr)**
   *
   * **[→ Options Docs](https://react-test.dev/documentation#attr)**
   */
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
