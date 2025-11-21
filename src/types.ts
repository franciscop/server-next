export type Method =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options"
  | "socket";

export type RouterMethod = "*" | Method;

export type Bucket = {
  read: (path: string) => Promise<ReadableStream | null>;
  write: (path: string, data: string | Buffer) => Promise<void | string>;
  delete: (path: string) => Promise<boolean>;
};

export type Cors = {
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

type KVStore = {
  name: string;
  prefix: (key: string) => KVStore;
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, options?: any) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  del: (key: string) => Promise<void>;
  keys: () => Promise<string[]>;
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
  auth?: any;
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
  cors?: Cors;
  auth?: any;
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
  [K in Params as K extends `${infer Key}:${infer Type}?`
    ? Key
    : K extends `${infer Key}:${infer Type}`
      ? Key
      : K extends `${infer Key}?`
        ? Key
        : K]: K extends `${infer Key}:${infer Type}?`
    ? InferParamType<Type> | undefined
    : K extends `${infer Key}:${infer Type}`
      ? InferParamType<Type>
      : K extends `${infer Key}?`
        ? string | undefined
        : string;
};

export type PathToParams<Path extends string> = ParamsToObject<
  ExtractPathParams<Path>
>;

export type Context<Params extends Record<string, any> = Record<string, string>> = {
  method: Method;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: any;
  url: URL & {
    params: Params;
    query: Record<string, string>;
  };
  options: Settings;
  time?: Time;
  session?: Record<string, any>;
  auth?: any;
  user?: any;
  res?: {
    headers: Record<string, string>;
    cookies: Record<string, any>;
  };
};

export type Body = string;

export type InlineReply =
  | Response
  | { body: Body; headers?: Headers }
  | string
  | number
  | undefined;

export type Middleware<Params extends Record<string, any> = Record<string, string>> = (ctx: Context<Params>) => InlineReply | void;
