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
  write: (path: string, data: string) => Promise<void | string>;
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

export type Context = {
  method: Method;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: any;
  url: URL & {
    params: Record<string, string>;
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

export type Middleware = (ctx: Context) => InlineReply | void;
