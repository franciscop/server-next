// The core request/response types. Domain types live next to their consumers
// and are re-exported from here, so the public surface is one flat namespace.
// Through this file, "options" refers to the ones that are accepted
// by the user while "settings" refers to the final parsed value
import type { Server } from ".";
import type { LimitOptions, UploadOptions } from "./body/upload";
import type { Bucket, BucketFile } from "./body/bucket";
import type { CorsOptions, CorsSettings } from "./http/cors";
import type { Logger, LogLevel } from "./boot/logger";
import type { SecurityOptions, SecuritySettings } from "./http/security";
import type { Time } from "./middle/timer";
import type { AuthMeta, AuthOption, AuthSettings } from "./auth/types";
import type { RequestError } from "./errors";
import type { SchemaOutput, StandardSchemaV1 } from "./pipeline/standardSchema";
import type { status } from "./reply";

export type {
  StandardIssue,
  StandardSchemaV1,
  SchemaOutput,
} from "./pipeline/standardSchema";
export type { FileInfo, BucketFile, Bucket } from "./body/bucket";
export type { UploadOptions, UploadedFile } from "./body/upload";
export type { CorsSettings } from "./http/cors";
export type { Logger, LogLevel } from "./boot/logger";
export type { SecurityOptions, SecuritySettings } from "./http/security";
export type { Cookie } from "./http/createCookies";
export type { Time } from "./middle/timer";
export type { RequestError } from "./errors";
export type {
  Strategy,
  AuthProfile,
  AuthMeta,
  AuthClaims,
  ProviderOptions,
  RedirectTargets,
  RedirectOption,
  AuthConfig,
  AuthVerify,
  AuthInstance,
  AuthFunction,
  AuthOption,
  AuthEntry,
  AuthSettings,
} from "./auth/types";
export type {
  ExtractPathParams,
  ParamTypeMap,
  InferParamType,
  ParamsToObject,
  PathToParams,
} from "./pipeline/pathPattern";

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

// How the request body is read into ctx.body: parsed (the default), the raw
// bytes as a Buffer, or the unread stream itself (a web ReadableStream).
export type BodyMode = "parse" | "raw" | "stream";

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
};

// A single registered route with its middleware chain already flattened in,
// and `uploads` already resolved to its final shape (see Router.handle)
export type Route = {
  path: string;
  options: Omit<RouteOptions, "uploads"> & { uploads?: Settings["uploads"] };
  fns: Middleware[];
};

export type BasicValue = string | number | boolean | null;

export type SerializableValue =
  | BasicValue
  | { [key: string]: SerializableValue }
  | Array<SerializableValue>;

type OnError = (
  error: RequestError,
  ctx: Context,
) => Response | Promise<Response>;

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
  uploads?: string | Bucket | UploadOptions | false;
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
  uploads?: ({ bucket: Bucket } & LimitOptions) | null | false;
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

export type Platform = {
  provider: string | null;
  runtime: string | null;
  production: boolean;
};

// What arrives as the 2nd `fetch` argument: env vars on the worker runtimes,
// or Bun's Server object (requestIP/upgrade) on Bun.
export type BunEnv = Record<string, string> & {
  upgrade?: (req: Request, options?: { data?: any }) => boolean;
  requestIP?: (req: Request) => { address: string } | null;
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

export type Middleware<C extends ContextTypes = {}> = (
  ctx: Context<C>,
) => InlineReply | Promise<InlineReply> | void | Promise<void>;
