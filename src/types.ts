// Through this file, "options" refers to the ones that are accepted
// by the user while "settings" refers to the final parsed value
import type { Server } from ".";
import type { LimitOptions } from "./helpers/upload";
import type { status } from "./reply";

// The chainable reply helpers (status/type/headers/cache/cookies/download) all
// return this. A handler may return one directly (e.g. `return status(401)`),
// finalized as an empty-body response; see parseResponse.
type Reply = ReturnType<typeof status>;

export type Method =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options"
  | "socket";

// The typed slices of `ctx` an app declares, e.g. `server<{ user: User }>()`;
// keys take plain types or Standard Schemas. See "Typing ctx" in the docs.
export type ContextTypes = {
  session?: any;
  user?: any;
  params?: any;
  query?: any;
  body?: any;
};

// A declared field's type (schemas resolve to their output); undeclared ones
// use open fallbacks so functions declaring different slices compose
type Field<C, K extends keyof ContextTypes, Fallback> = K extends keyof C
  ? SchemaOutput<C[K], C[K]>
  : Fallback;

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

// The Standard Schema protocol (https://standardschema.dev), vendored since
// it's a types-only spec: any library implementing `~standard` (zod, valibot,
// arktype, ...) can be a route schema. `validate` returns the validated value
// or the issues; it never throws, and it may be async.
export type StandardIssue = {
  readonly message: string;
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[];
};

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) =>
      | { value: Output; issues?: undefined }
      | { issues: readonly StandardIssue[] }
      | Promise<
          | { value: Output; issues?: undefined }
          | { issues: readonly StandardIssue[] }
        >;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}

// The validated type a schema produces, or the fallback without one. The
// brackets keep the conditional from distributing: an absent schema is
// `StandardSchemaV1 | undefined`, which must resolve to the fallback whole.
export type SchemaOutput<S, Fallback> = [S] extends [
  StandardSchemaV1<any, infer Output>,
]
  ? Output
  : Fallback;

// How responses are cached: a duration ('1h'), a number of seconds, or `false`
// (`0`) for no-store. Sets `Cache-Control`; for anything fancier, use headers().
export type CacheOption = string | number | false;

// Spec-only metadata for the OpenAPI docs; inert at request time
export type RouteSchema = {
  tags?: string | string[];
  title?: string;
  description?: string;
};

export type RouteOptions = {
  schema?: RouteSchema;
  // How this route reads its body, overriding the root `parser`
  parser?: BodyMode;
  // Standard Schemas validating each part of the request, and the response.
  // A `body` schema needs `parser: 'parse'` (the default); combining it with
  // `raw`/`stream` throws at boot.
  body?: StandardSchemaV1<any, any>;
  query?: StandardSchemaV1<any, any>;
  params?: StandardSchemaV1<any, any>;
  response?: StandardSchemaV1<any, any>;
  cache?: CacheOption;
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

// Subset of the `bucket` library's FileInfo: file metadata used to build cheap
// cache validators (ETag / Last-Modified) without reading the bytes. `info()`
// resolves to null when the file doesn't exist, so these are always real.
export type FileInfo = {
  size: number;
  type: string | null;
  modified: Date;
};

// Mirrors the `bucket` library's BucketFile: a handle to a single object.
export type BucketFile = {
  // The file's key within the bucket, like "avatars/me.jpg". Not a filesystem
  // path, so it reads the same whether the bucket is local or in the cloud.
  readonly path: string;
  // Just the filename, with no folder
  readonly name: string;
  // The file's MIME type, when the bucket knows it (like Blob/File.type).
  readonly type?: string;
  exists(): Promise<boolean>;
  // Optional: metadata in one call, or null when the file doesn't exist.
  // `bucket` files provide it; used for conditional-request caching of assets.
  info?(): Promise<FileInfo | null>;
  write(
    content: string | Buffer | ReadableStream,
    options?: { type?: string },
  ): Promise<void>;
  stream(): ReadableStream;
  // Optional: a read-only view of the byte range `[start, end)` (end exclusive
  // and optional, like Blob.slice), whose stream()/bytes() read just that range.
  // Used to answer HTTP Range requests for static assets.
  slice?(start: number, end?: number): BucketFile;
  bytes(): Promise<Uint8Array>;
  remove(): Promise<void>;
};

// Mirrors the `bucket` library's IBucket. The framework only ever needs
// `file(name)`; `folder(prefix)` is an optional convenience for user handlers
// that want to scope storage (e.g. per-request folders), so it's not required
// of a backend the framework is handed.
export type Bucket = {
  file(name: string): BucketFile;
  folder?(prefix: string): Bucket;
};

export type UploadedFile = {
  // The filename the client sent
  name: string;
  // Where it's stored: its key within the bucket, to read or serve it later
  path: string;
  type: string;
  size: number;
};

// The `uploads` option's object form: where to store files, plus optional
// per-file validation. A bare path/Bucket streams files through unvalidated.
export type UploadOptions = LimitOptions & {
  bucket: string | Bucket;
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

// Anything the `store` / `session` options accept: a plain `Map`, a Redis or
// DynamoDB client, a `file://` path, or an already-wrapped store. It's passed
// through polystore's `kv()` at boot, so routes always see a `KVStore`.
export type StoreSource = KVStore | Map<string, any> | string | Record<string, any>;

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

// The reserved auth fields on ctx.session (`cookie`/`token` strategies):
// `user` keys into `auth.users`, and present means signed in.
export type AuthSession = {
  user: string;
  provider: Provider;
  created: string;
};

export type AuthUser<T = Record<string, any>> = T & {
  id: string | number;
  provider: Provider;
  strategy: Strategy;
  email: string;
};

// The minimum every auth callback must return: the `id` keys the user in the
// store, and the `email` is guaranteed on every user auth hands you.
export type ProfileUser = { id: string | number; email: string } & Record<
  string,
  any
>;

// The string form takes a single provider (`<strategy>:<provider>`). For several
// providers, use the object form with a `providers` array.
export type AuthOption =
  | `${Strategy}:${Provider}`
  | {
      strategy: Strategy;
      providers?: Provider | Provider[];
      // One record per person, keyed by ctx.session.user. Defaults to an
      // in-memory Map; production requires an explicit store.
      users?: StoreSource;
      redirect?: string;
      // Callbacks over the login lifecycle. Each one fully replaces the
      // built-in step (they never run "on top of" the default), and the user
      // they return must carry an `id` and an `email`. Deny by throwing.
      // Maps a provider's raw OAuth payload into your user (OAuth logins only)
      onProfile?: (raw: any, provider: Provider) => ProfileUser | Promise<ProfileUser>;
      // Builds the record to persist from the fresh login + the stored user
      // (`null` on a first login); the default is an upsert where fresh wins
      onLogin?: (
        loginUser: AuthUser,
        existingUser: AuthUser | null,
        ctx: Context,
      ) => ProfileUser | Promise<ProfileUser>;
      // Shapes the user exposed on ctx.user and login responses; the default
      // strips `password`. Runs on every authenticated request
      onUser?: <T = AuthUser>(user: T, ctx: Context) => T | Promise<T>;
      // Builds the `jwt` token payload from the stored record, once per login;
      // the default strips `password`. The payload is client-readable.
      onToken?: (user: AuthUser, ctx: Context) => ProfileUser | Promise<ProfileUser>;
      // Event fired when a session is revoked through POST /auth/logout
      onLogout?: (ctx: Context) => unknown;
    };

export type AuthSettings = {
  providers: Provider[];
  strategy: Strategy;

  // One record per person; sessions point into it via their `user` field
  users: KVStore;

  onProfile?: (raw: any, provider: Provider) => ProfileUser | Promise<ProfileUser>;
  onLogin?: (
    loginUser: AuthUser,
    existingUser: AuthUser | null,
    ctx: Context,
  ) => ProfileUser | Promise<ProfileUser>;
  onUser: <T = AuthUser>(user: T, ctx: Context) => T | Promise<T>;
  onToken: (user: AuthUser, ctx: Context) => ProfileUser | Promise<ProfileUser>;
  onLogout?: (ctx: Context) => unknown;
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
  // Secure-by-default response headers. Each accepts `false` to turn it off, or
  // a string to override the value. The first group is on by default.
  frameguard?: boolean | string; // X-Frame-Options, default 'SAMEORIGIN'
  noSniff?: boolean; // X-Content-Type-Options: nosniff, default on
  referrerPolicy?: boolean | string; // default 'strict-origin-when-cross-origin'
  hsts?: boolean | string; // Strict-Transport-Security (production only)
  xssProtection?: boolean; // X-XSS-Protection: 0, default on
  // Reject route params that climb the path ('../'), default on
  traversalProtection?: boolean;
  // Cap on the request bytes buffered in memory (default '1mb'; false = none).
  // Files are exempt: they stream to `uploads` and follow its own maxSize.
  maxBody?: number | string | false;
  // Opt-in (off unless set):
  csp?: boolean | string; // Content-Security-Policy
  coop?: boolean | string; // Cross-Origin-Opener-Policy
  corp?: boolean | string; // Cross-Origin-Resource-Policy
  permissionsPolicy?: string; // Permissions-Policy
};

export type SecuritySettings = {
  trustProxy: boolean;
  // Reject route params containing a '..' path segment
  traversalProtection: boolean;
  // Resolved byte cap for buffered request bytes (Infinity when disabled)
  maxBody: number;
  // Resolved static headers applied to every response
  headers: Record<string, string>;
  // Resolved HSTS value, applied only on production (HTTPS) responses
  hsts: string | null;
};

type OnError = (error: Error, ctx: Context) => Response | Promise<Response>;

// A hook over every outgoing HTTP response. Return a Response to replace it
// (sent as-is, no re-finalizing), or nothing to leave it unchanged.
type OnResponse = (
  response: Response,
  ctx: Context,
) => Response | void | Promise<Response | void>;

export type Options = {
  port?: number;
  secret?: string;
  public?: string | Bucket;
  uploads?: string | Bucket | UploadOptions;
  // One record per device, exposed as ctx.session. Defaults to an in-memory
  // Map; raw sources (a Map, a Redis client) get a 1w expiry, a built store
  // (`kv(redis).expires('2w')`) is honored as-is.
  sessions?: StoreSource;
  cors?: CorsOptions;
  auth?: AuthOption;
  openapi?: any;
  onError?: OnError;
  onResponse?: OnResponse;
  log?: LogLevel | boolean;
  favicon?: string | BucketFile;
  security?: boolean | SecurityOptions;
  // How request bodies are read into ctx.body (default 'parse')
  parser?: BodyMode;
  cache?: CacheOption;
};

export type Settings = {
  port: number;
  secret: string;
  public?: Bucket;
  uploads?: ({ bucket: Bucket } & LimitOptions) | null;
  sessions: KVStore;
  // Internal: `sessions` came from the in-memory default (drives a one-time
  // warning on the first session write in production)
  sessionsDefault?: boolean;
  cors?: CorsSettings;
  auth?: AuthSettings;
  openapi?: any;
  onError?: OnError;
  onResponse?: OnResponse;
  log: Logger;
  favicon?: string | BucketFile;
  security: SecuritySettings;
  parser: BodyMode;
  cache?: CacheOption;
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
  upgrade?: (req: Request, options?: { data?: any }) => boolean;
};

// Augment this to type the fields your own middleware puts on `ctx`:
//
//   declare module "@server/next" {
//     interface ContextExtension { project?: Project }
//   }
//
// It's a separate, non-generic interface because only interfaces can be
// augmented, and repeating `Context`'s type parameters in every app would
// freeze them forever. Keep the fields optional: the augmentation applies to
// every `ctx`, including requests that never ran the middleware.
// biome-ignore lint/suspicious/noEmptyInterface: a type alias can't be augmented
export interface ContextExtension {}

export type Context<C extends ContextTypes = {}> = {
  method: Method;
  ip: string;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: Field<C, "body", SerializableValue | Buffer | ReadableStream>;
  url: URL & {
    params: Field<C, "params", Record<string, any>>;
    query: Field<C, "query", Record<string, any>>;
  };
  options: Settings;
  platform: Platform;
  time?: Time;
  socket?: WebSocket;
  sockets?: WebSocket[];
  session: Field<C, "session", Record<string, any>>;
  user?: Field<C, "user", Record<string, any>>;
  init: number;
  req?: Request;
  res?: Response & { cookies?: Record<string, string> };
  app: Server;
} & ContextExtension;

export type InlineReply =
  | Response
  | Reply
  | BucketFile
  | { body: string; headers?: Headers }
  | SerializableValue
  | JSX.Element
  | Buffer
  | ReadableStream;

export type Body = InlineReply;

export type Middleware<C extends ContextTypes = {}> = (
  ctx: Context<C>,
) => InlineReply | Promise<InlineReply> | void | Promise<void>;
