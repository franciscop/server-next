// Through this file, "options" refers to the ones that are accepted
// by the user while "settings" refers to the final parsed value
import type { Server } from ".";
import type { UploadPipeline } from "./helpers/upload";

export type Method =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options"
  | "socket";

export type ServerConfig<Session = {}, User = {}> = {
  Session?: Session; // drives ctx.session typing
  User?: User; // drives ctx.user typing
};

declare namespace JSX {
  // The shape of what JSX emits in your system.
  // It does NOT pull in React at all.
  interface Element {
    type: any;
    props: any;
  }

  // Allow any intrinsic tags (<div>, <p>, etc.)
  interface IntrinsicElements {
    [elem: string]: any;
  }
}

// How the request body is read into ctx.body: parsed (the default), the raw
// bytes as a Buffer, or the unread stream itself (a web ReadableStream).
export type BodyMode = "parse" | "raw" | "stream";

export type RouteOptions = {
  tags?: string | string[];
  title?: string;
  description?: string;
  body?: BodyMode;
  // [key: string]: any;
};

// A single registered route with its middleware chain already flattened in
export type Route = {
  path: string;
  options: RouteOptions;
  fns: Middleware[];
};

export type Cookie = {
  value?: string | null;
  path?: string;
  expires?: number | string | Date;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

export type RouterMethod = "*" | Method;

export type Bucket = {
  location?: string;
  read: (path: string) => Promise<ReadableStream | null>;
  write: (
    path: string,
    data: string | Buffer | ReadableStream,
  ) => Promise<void | string>;
  delete: (path: string) => Promise<boolean>;
  folder?: (prefix: string) => Bucket;
};

export type UploadedFile = {
  name: string;
  id: string;
  path: string;
  type: string;
  size: number;
};

export type CorsSettings = {
  origin: string | boolean;
  methods: string;
  headers: string;
  credentials?: boolean;
};

type CorsOptions =
  | boolean
  | string
  | string[]
  | {
      origin?: string | string[];
      methods?: string | Method[];
      headers?: string | string[];
      credentials?: boolean;
    };

export type BasicValue = string | number | boolean | null;

export type SerializableValue =
  | BasicValue
  | { [key: string]: SerializableValue }
  | Array<SerializableValue>;

export type KVStore = {
  name?: string;
  prefix: (prefix?: string) => KVStore;
  get: <T = SerializableValue>(key: string) => Promise<T | null>;
  set: <T = SerializableValue>(
    key: string,
    value: T,
    options?: { expires?: string | number | null },
  ) => Promise<void | string>;
  has: (key: string) => Promise<boolean>;
  del: (key: string) => Promise<void | string>;
  keys: () => Promise<string[]>;
};

export type Provider =
  | "email"
  | "github"
  | "google"
  | "microsoft"
  | "discord"
  | "facebook"
  | "apple";
export type Strategy = "cookie" | "jwt" | "token";

export type AuthSession = {
  id: string;
  provider: Provider;
  strategy: Strategy;
  user: string;
};

export type AuthUser<T = Record<string, any>> = T & {
  id: string | number;
  provider: Provider;
  strategy: Strategy;
  email: string;
};

// The string form takes a single provider (`<strategy>:<provider>`). For several
// providers, use the object form with a `providers` array.
export type AuthOption =
  | `${Strategy}:${Provider}`
  | {
      strategy: Strategy;
      providers: Provider | Provider[];
      session?: KVStore;
      store?: KVStore;
      redirect?: string;
      cleanUser?: <T = AuthUser>(user: T) => T | Promise<T>;
    };

export type AuthSettings = {
  providers: Provider[];
  strategy: Strategy;

  // The store with the original source of users
  store: KVStore;

  // The temporal information of active sessions/devices
  session: KVStore;

  cleanUser: <T = AuthUser>(user: T) => T | Promise<T>;
  redirect: string;
};

export type LogLevel = "info";

export type Logger = {
  level?: LogLevel;
  // Low-level helper, prints `[server:<scope>] <message>` when enabled
  message: (scope: string, message: string) => void;
  // `[server:start] http://localhost:3000/`
  start: (url: string) => void;
  // `[server:api] POST /hello/world 1kb → 200 OK 10kb`
  request: (ctx: Context, res: Response) => void;
};

export type SecurityOptions = {
  // Trust X-Forwarded-* headers for ctx.ip (on by default)
  trustProxy?: boolean;
};

export type SecuritySettings = {
  trustProxy: boolean;
};

type OnError = (error: Error, ctx: Context) => Response | Promise<Response>;

export type Options = {
  port?: number;
  secret?: string;
  public?: string | Bucket;
  uploads?: string | Bucket | UploadPipeline;
  store?: KVStore;
  cookies?: KVStore;
  session?: KVStore | { store: KVStore };
  cors?: CorsOptions;
  auth?: AuthOption;
  openapi?: any;
  onError?: OnError;
  log?: LogLevel | boolean;
  favicon?: string | Bucket;
  security?: SecurityOptions;
  body?: BodyMode;
};

export type Settings = {
  port: number;
  secret: string;
  public?: Bucket;
  uploads?: Bucket | UploadPipeline;
  store?: KVStore;
  cookies?: KVStore;
  session?: { store: KVStore };
  cors?: CorsSettings;
  auth?: AuthSettings;
  openapi?: any;
  onError?: OnError;
  log: Logger;
  favicon?: string | Bucket;
  security: SecuritySettings;
  body: BodyMode;
};

export type Time = {
  (name: string): void;
  times: [string, number][];
  headers: () => string;
};

export type Platform = {
  provider: string | null;
  runtime: string | null;
  production: boolean;
};

// Path parameter type inference utilities
export type ExtractPathParams<Path extends string> =
  Path extends `${string}:${infer Param}(${infer Type})?/${infer Rest}`
    ? `${Param}:${Type}?` | ExtractPathParams<`/${Rest}`>
    : Path extends `${string}:${infer Param}(${infer Type})?`
      ? `${Param}:${Type}?`
      : Path extends `${string}:${infer Param}(${infer Type})/${infer Rest}`
        ? `${Param}:${Type}` | ExtractPathParams<`/${Rest}`>
        : Path extends `${string}:${infer Param}(${infer Type})`
          ? `${Param}:${Type}`
          : Path extends `${string}:${infer Param}?/${infer Rest}`
            ? `${Param}?` | ExtractPathParams<`/${Rest}`>
            : Path extends `${string}:${infer Param}?`
              ? `${Param}?`
              : Path extends `${string}:${infer Param}/${infer Rest}`
                ? Param | ExtractPathParams<`/${Rest}`>
                : Path extends `${string}:${infer Param}`
                  ? Param
                  : never;

export type ParamTypeMap = {
  string: string;
  number: number;
  date: Date;
};

export type InferParamType<T extends string> = T extends keyof ParamTypeMap
  ? ParamTypeMap[T]
  : string;

export type ParamsToObject<Params extends string> = {
  [K in Params as K extends `${infer Key}:${infer _Type}?`
    ? Key
    : K extends `${infer Key}:${infer _Type}`
      ? Key
      : K extends `${infer Key}?`
        ? Key
        : K]: K extends `${infer _Key}:${infer Type}?`
    ? InferParamType<Type> | undefined
    : K extends `${infer _Key}:${infer Type}`
      ? InferParamType<Type>
      : K extends `${infer _Key}?`
        ? string | undefined
        : string;
};

export type PathToParams<Path extends string> = ParamsToObject<
  ExtractPathParams<Path>
>;

export type BunEnv = Record<string, string> & {
  upgrade?: (req: Request) => boolean;
};

export type EventCallback = (data: Context & SerializableValue) => void;
type Events = Record<string, EventCallback[]> & {
  on?: (key: string, cb: (value?: Context & SerializableValue) => void) => void;
  trigger?: (key: string, value?: Partial<Context & SerializableValue>) => void;
};

export type Context<
  Params extends Record<string, string | undefined> = Record<string, string>,
  O extends ServerConfig = object,
> = {
  method: Method;
  ip: string;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: SerializableValue | Buffer | ReadableStream;
  url: URL & {
    params: Params;
    query: Record<string, string>;
  };
  options: Settings;
  platform: Platform;
  time?: Time;
  socket?: WebSocket;
  sockets?: WebSocket[];
  session: O extends { Session?: infer S }
    ? S extends Record<"Session", infer Inner>
      ? Inner
      : Record<string, any>
    : Record<string, any>;

  user?: O extends { User?: infer U }
    ? U extends Record<"User", infer Inner>
      ? Inner
      : AuthUser
    : AuthUser;
  // user?: O extends { User: infer U } ? U & AuthUser : AuthUser;
  init: number;
  events: Events;
  req?: Request;
  res?: Response & { cookies?: Record<string, string> };
  app: Server;
};

export type InlineReply =
  | Response
  | { body: string; headers?: Headers }
  | SerializableValue
  | JSX.Element
  | Buffer
  | ReadableStream;

export type Body = InlineReply;

export type Middleware<
  O extends ServerConfig = object,
  Params extends Record<string, string | undefined> = Record<string, string>,
> = (
  ctx: Context<Params, O>,
) => InlineReply | Promise<InlineReply> | void | Promise<void>;
