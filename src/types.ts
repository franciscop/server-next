// Through this file, "options" refers to the ones that are accepted
// by the user while "settings" refers to the final parsed value
import type { Server } from ".";

export type Method =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options"
  | "socket";

export type ServerConfig = {
  User?: Record<string, string | number | boolean | Date | null | undefined>;
};

export type RouteOptions = {
  tags?: string | string[];
  title?: string;
  description?: string;
  // [key: string]: any;
};

export type RouterMethod = "*" | Method;

export type Bucket = {
  read: (path: string) => Promise<ReadableStream | null>;
  write: (path: string, data: string | Buffer) => Promise<void | string>;
  delete: (path: string) => Promise<boolean>;
};

export type CorsSettings = {
  origin: string | boolean;
  methods: string;
  headers: string;
};

type CorsOptions =
  | boolean
  | string
  | string[]
  | {
      origin?: string | string[];
      methods?: string | Method[];
      headers?: string | string[];
    };

export type BasicValue = string | number | boolean | null;

export type SerializableValue =
  | BasicValue
  | { [key: string]: SerializableValue }
  | Array<SerializableValue>;

export type KVStore = {
  name: string;
  prefix: (key: string) => KVStore;
  get: <T = SerializableValue>(key: string) => Promise<T>;
  set: <T = SerializableValue>(
    key: string,
    value: T,
    options?: { expires: string | number },
  ) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  del: (key: string) => Promise<void>;
  keys: () => Promise<string[]>;
};

export type Provider = "email" | "github";
export type Strategy = "cookies" | "jwt" | "token";

export type AuthSession = {
  id: string;
  provider: Provider;
  strategy: Strategy;
  user: string;
};

export type AuthUser<T = object> = T & {
  id: string | number;
  provider: Provider;
  strategy: Strategy;
  email: string;
};

export type AuthOption =
  | `${Strategy}:${Provider}`
  | {
      provider?: Provider | Provider[];
      strategy?: Strategy;
      session?: KVStore;
      store?: KVStore;
      redirect?: string;
      cleanUser?: <T = AuthUser>(user: T) => T | Promise<T>;
    };

export type AuthSettings = {
  id: string; // ID of the session
  provider: Provider[];
  strategy: Strategy;

  // The store with the original source of users
  store: KVStore;

  // The temporal information of active sessions/devices
  session: KVStore;

  cleanUser: <T = AuthUser>(user: T) => T | Promise<T>;
  redirect: string;
};

export type Options = {
  port?: number;
  secret?: string;
  views?: string | Bucket;
  public?: string | Bucket;
  uploads?: string | Bucket;
  store?: KVStore;
  cookies?: KVStore;
  session?: KVStore | { store: KVStore };
  cors?: CorsOptions;
  auth?: AuthOption;
  openapi?: any;
};

export type Settings = {
  port: number;
  secret: string;
  views?: Bucket;
  public?: Bucket;
  uploads?: Bucket;
  store?: KVStore;
  cookies?: KVStore;
  session?: { store: KVStore };
  cors?: CorsSettings;
  auth?: AuthSettings;
  openapi?: any;
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
  Params extends Record<string, string> = Record<string, string>,
  O extends ServerConfig = object,
> = {
  method: Method;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: SerializableValue;
  url: URL & {
    params: Params;
    query: Record<string, string>;
  };
  options: Settings;
  platform: Platform;
  time?: Time;
  socket?: WebSocket;
  sockets?: WebSocket[];
  session?: Record<string, BasicValue>;
  // The value of the authorized user
  user?: O extends { User: infer U } ? U & AuthUser : AuthUser;
  init: number;
  events: Events;
  req?: Request;
  res?: Response;
  app: Server;
};

export type InlineReply =
  | Response
  | { body: string; headers?: Headers }
  | SerializableValue;

export type Body = InlineReply;

export type Middleware<
  O extends ServerConfig = object,
  Params extends Record<string, string> = Record<string, string>,
> = (
  ctx: Context<Params, O>,
) => InlineReply | Promise<InlineReply> | void | Promise<void>;
