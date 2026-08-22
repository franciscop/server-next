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
  // What JSX emits here: rendering is deferred, so an element is a thunk that
  // produces the HTML when called. It does NOT pull in React at all.
  interface Element {
    (): string;
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
  // `false` hides the route from the spec
  schema?: RouteSchema | false;
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
  // Where this route's files go, replacing the root `uploads` wholesale
  // (limits included); `false` skips file fields for this route
  uploads?: string | Bucket | UploadOptions | false;
  // [key: string]: any;
};

// A single registered route with its middleware chain already flattened in,
// and `uploads` already resolved to its final shape (see Router.handle)
export type Route = {
  path: string;
  options: Omit<RouteOptions, "uploads"> & { uploads?: Settings["uploads"] };
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

export type Strategy = "session" | "cookie" | "token" | "jwt";

// What every provider produces, normalised, so adding one is not a code change.
// `raw` keeps the untouched response for provider-specific fields.
export type AuthProfile = {
  provider: string;
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  raw: Record<string, any>;
};

// What the credential itself asserts, with no lookup behind it. Present
// whenever a credential we can read authenticated the request, so absent for
// the function and library shapes, where there is nothing of ours to parse.
export type AuthMeta = {
  issuedAt: Date;
  expiresAt?: Date;
  // How this particular request authenticated, when several are accepted
  strategy?: Strategy;
  // Who vouched for them: the provider they logged in with, or the issuer
  provider?: string;
};

// A verified token's payload; `sub` is the person's id at that issuer
export type AuthClaims = { sub: string } & Record<string, any>;

type Awaitable<T> = T | Promise<T>;

// Only the handshake is configured per provider; everything else is app-wide.
// Unknown keys pass through to that provider's authorize URL.
export type ProviderOptions = {
  id?: string;
  secret?: string;
  scope?: string | string[];
  // An OIDC issuer, which makes this a generic provider: discovery finds its
  // endpoints and the id_token claims become the profile
  issuer?: string;
} & Record<string, any>;

export type RedirectOption =
  | string
  | ((user: any, ctx: Context) => Awaitable<string>)
  | {
      login?: string | ((user: any, ctx: Context) => Awaitable<string>);
      logout?: string;
      error?: string;
    };

// A login flow we run: the routes are mounted here, the credential is ours
export type AuthConfig<U = AuthProfile> = {
  providers: string | readonly string[] | Record<string, string | ProviderOptions>;
  strategy?: Strategy | readonly Strategy[];
  expires?: string;
  redirect?: RedirectOption;
  // Once, after a handshake: store whoever this is and return the id the
  // credential points at. Refuse a login by throwing
  onLogin?: (
    profile: AuthProfile,
    ctx: Context,
  ) => Awaitable<string | number | undefined>;
  // That id back into the user. Per request for `session` and `token`, once at
  // login for `cookie` and `jwt`
  getUser?: (id: string, ctx: Context) => Awaitable<U>;
  // What gets signed into the credential, for `cookie` and `jwt`
  toPublicUser?: (user: any) => Awaitable<any>;
  // Anything of yours that should go when the credential is cleared
  onLogout?: (id: string, ctx: Context) => Awaitable<void>;
};

// A credential minted elsewhere: no routes, no client secret, no flow.
// `audience` is required, since one issuer serves many applications
export type AuthVerify<U = AuthClaims> = {
  // The OIDC issuer whose tokens this accepts, the same URL a provider would
  // take. Its keys are discovered from it and cached.
  issuer: string;
  audience: string | readonly string[];
  // Where the token rides. Defaults to `Authorization: Bearer`; name a cookie
  // when their SDK stores it there for a same-origin app
  cookie?: string;
  // Which claim carries the audience. Standard is `aud`, but Clerk uses
  // `azp` and Cognito access tokens use `client_id`. The first one present
  // is the one checked.
  audienceClaim?: string | readonly string[];
  getUser?: (id: string, ctx: Context) => Awaitable<U>;
};

// A library that runs its own handshake and serves its own routes
export type AuthInstance = {
  handler: (request: Request) => Awaitable<Response>;
  path?: string;
  user?: (ctx: Context) => Awaitable<any>;
};

// Request in, user out, for a credential we did not mint
export type AuthFunction<U = any> = (ctx: Context<any>) => Awaitable<U>;

// The string form is `<strategy>:<provider>` and takes no callbacks, so there
// is no database: the profile itself is signed into the credential.
export type AuthOption =
  | string
  | AuthFunction
  | AuthConfig<any>
  | AuthVerify<any>
  | AuthInstance
  | readonly AuthOption[];

// `ctx.user` is whatever the configured `auth` produces, so an app never
// declares a User type. An array gives the union of its members.
export type UserOf<A> = A extends readonly (infer M)[]
  ? UserOf<M>
  : A extends (...args: any[]) => infer R
    ? NonNullable<Awaited<R>>
    : A extends { getUser: (...args: any[]) => infer R }
      ? NonNullable<Awaited<R>>
      : A extends { issuer: any }
        ? AuthClaims
        : A extends { providers: any }
          ? AuthProfile
          : A extends string
            ? AuthProfile
            : never;

// Every shape normalises to this: resolve a user, and optionally own some
// routes. The array is tried in order, first to answer wins.
export type AuthEntry = {
  name: string;
  user: (ctx: Context) => Promise<any>;
  routes?: (app: Server) => void;
};

export type AuthSettings = AuthEntry[];

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

export type Options<A = AuthOption> = {
  port?: number;
  // Signs tokens. Several rotate: the first signs, any of them verifies
  secrets?: string | string[];
  public?: string | Bucket;
  uploads?: string | Bucket | UploadOptions;
  cors?: CorsOptions;
  auth?: A;
  // Serve the generated OpenAPI spec: `true` for /openapi.json, a string for
  // another path, or an object also overriding the package.json-derived info
  openapi?:
    | boolean
    | string
    | { path?: string; title?: string; description?: string; version?: string };
  onError?: OnError;
  onResponse?: OnResponse;
  log?: LogLevel | boolean;
  security?: boolean | SecurityOptions;
  // How request bodies are read into ctx.body (default 'parse')
  parser?: BodyMode;
  cache?: CacheOption;
};

export type Settings = {
  port: number;
  // Every key accepted when verifying; the first is the one that signs
  secrets: string[];
  public?: Bucket;
  uploads?: ({ bucket: Bucket } & LimitOptions) | null;
  cors?: CorsSettings;
  auth?: AuthSettings;
  openapi?: {
    path: string;
    title?: string;
    description?: string;
    version?: string;
  };
  onError?: OnError;
  onResponse?: OnResponse;
  log: Logger;
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
  signal: AbortSignal;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  url: URL & {
    params: Field<C, "params", Record<string, any>>;
    query: Field<C, "query", Record<string, any>>;
  };
  options: Settings;
  platform: Platform;
  time?: Time;
  socket?: WebSocket;
  sockets?: WebSocket[];
  user?: Field<C, "user", Record<string, any>>;
  auth?: AuthMeta;
  init: number;
  app: Server;
} & ("body" extends keyof C
  ? // A declared `body` is validated before any middleware runs, so it exists
    { body: Field<C, "body", never> }
  : { body?: SerializableValue | Buffer | ReadableStream }) &
  ContextExtension;

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
