import * as http from 'http';
import { Readable } from 'node:stream';
export { default as bucket } from 'bucket';

type FileInfo = {
    size: number;
    type: string | null;
    modified: Date;
};
type BucketFile = {
    readonly path: string;
    readonly name: string;
    readonly type?: string;
    exists(): Promise<boolean>;
    info?(): Promise<FileInfo | null>;
    write(content: string | Buffer | ReadableStream, options?: {
        type?: string;
    }): Promise<void>;
    stream(): ReadableStream;
    slice?(start: number, end?: number): BucketFile;
    bytes(): Promise<Uint8Array>;
    remove(): Promise<void>;
};
type Bucket = {
    file(name: string): BucketFile;
    folder?(prefix: string): Bucket;
};

type LimitOptions = {
    maxFileSize?: number | string;
    maxTotalSize?: number | string;
    maxFiles?: number;
    minSize?: number | string;
    fileType?: string[];
};
type UploadOptions = LimitOptions & {
    bucket: string | Bucket;
};
type UploadedFile = {
    name: string;
    path: string;
    type: string;
    size: number;
};

type CorsSettings = {
    origin: string | boolean;
    methods: string;
    headers: string;
    credentials?: boolean;
};
type CorsOptions = boolean | string | string[] | {
    origin?: string | string[];
    methods?: string | Method[];
    headers?: string | string[];
    credentials?: boolean;
};

type LogLevel = "info";
type Logger = {
    level?: LogLevel;
    message: (scope: string, message: string) => void;
    start: (url: string) => void;
    request: (ctx: Context, res: Response) => void;
};

type SecurityOptions = {
    trustProxy?: boolean;
    frameguard?: boolean | string;
    noSniff?: boolean;
    referrerPolicy?: boolean | string;
    hsts?: boolean | string;
    xssProtection?: boolean;
    traversalProtection?: boolean;
    maxBodySize?: number | string | false;
    csp?: boolean | string;
    coop?: boolean | string;
    corp?: boolean | string;
    permissionsPolicy?: string;
};
type SecuritySettings = {
    trustProxy: boolean;
    traversalProtection: boolean;
    maxBodySize: number;
    headers: Record<string, string>;
    hsts: string | null;
};

type Time = {
    (name: string): void;
    times: [string, number][];
    headers: () => string;
};

type Fn<C extends ContextTypes> = (ctx: Context<C>) => ReturnType<Middleware>;
type RouteCtx<C extends ContextTypes, RO extends RouteOptions, Params> = Omit<C, "params" | "query" | "body"> & {
    params: [RO["params"]] extends [StandardSchemaV1<any, any>] ? RO["params"] : Params;
} & Pick<RO, keyof RO & ("query" | "body")>;
type Mids<C extends ContextTypes, Path extends string, RO extends RouteOptions = {}> = Fn<RouteCtx<C, RO, PathToParams<Path>>>[];
type Exact<RO> = RouteOptions & {
    [K in Exclude<keyof RO, keyof RouteOptions>]: never;
};
declare class Router<C extends ContextTypes = {}> {
    protected settings?: Settings;
    middleware: Middleware[];
    handlers: Record<Method, Route[]>;
    self(): this;
    handle(method: Method, pathOrFn?: any, ...rest: any[]): this;
    socket<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
    socket(...middleware: Fn<C>[]): this;
    socket<RO extends Exact<RO>>(options: RO, ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]): this;
    socket<Path extends string, RO extends Exact<RO>>(path: Path, options: RO, ...middleware: Mids<C, Path, RO>): this;
    get<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
    get(...middleware: Fn<C>[]): this;
    get<RO extends Exact<RO>>(options: RO, ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]): this;
    get<Path extends string, RO extends Exact<RO>>(path: Path, options: RO, ...middleware: Mids<C, Path, RO>): this;
    head<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
    head(...middleware: Fn<C>[]): this;
    head<RO extends Exact<RO>>(options: RO, ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]): this;
    head<Path extends string, RO extends Exact<RO>>(path: Path, options: RO, ...middleware: Mids<C, Path, RO>): this;
    post<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
    post(...middleware: Fn<C>[]): this;
    post<RO extends Exact<RO>>(options: RO, ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]): this;
    post<Path extends string, RO extends Exact<RO>>(path: Path, options: RO, ...middleware: Mids<C, Path, RO>): this;
    put<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
    put(...middleware: Fn<C>[]): this;
    put<RO extends Exact<RO>>(options: RO, ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]): this;
    put<Path extends string, RO extends Exact<RO>>(path: Path, options: RO, ...middleware: Mids<C, Path, RO>): this;
    patch<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
    patch(...middleware: Fn<C>[]): this;
    patch<RO extends Exact<RO>>(options: RO, ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]): this;
    patch<Path extends string, RO extends Exact<RO>>(path: Path, options: RO, ...middleware: Mids<C, Path, RO>): this;
    delete<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
    delete(...middleware: Fn<C>[]): this;
    delete<RO extends Exact<RO>>(options: RO, ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]): this;
    delete<Path extends string, RO extends Exact<RO>>(path: Path, options: RO, ...middleware: Mids<C, Path, RO>): this;
    options<Path extends string>(path: Path, ...middleware: Mids<C, Path>): this;
    options(...middleware: Fn<C>[]): this;
    options<RO extends Exact<RO>>(options: RO, ...middleware: Fn<RouteCtx<C, RO, Record<string, string>>>[]): this;
    options<Path extends string, RO extends Exact<RO>>(path: Path, options: RO, ...mid: Mids<C, Path, RO>): this;
    use(...middleware: Fn<C>[]): this;
    use(router: Router<any>): this;
}
declare function router<C extends ContextTypes = {}>(): Router<C>;

type Awaitable<T> = T | Promise<T>;
type Strategy = "session" | "cookie" | "token" | "jwt";
type AuthProfile = {
    provider: string;
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    accessToken?: string;
    refreshToken?: string;
    raw: Record<string, any>;
};
type AuthMeta = {
    issuedAt: Date;
    expiresAt?: Date;
    strategy?: Strategy;
    provider?: string;
};
type AuthClaims = {
    sub: string;
} & Record<string, any>;
type ProviderOptions = {
    id?: string;
    secret?: string;
    scope?: string | string[];
    issuer?: string;
} & Record<string, any>;
type RedirectTargets = {
    login?: string | ((user: any, ctx: Context) => Awaitable<string>);
    logout?: string;
    error?: string;
};
type RedirectOption = string | ((user: any, ctx: Context) => Awaitable<string>) | RedirectTargets;
type AuthConfig<U = AuthProfile> = {
    providers: string | readonly string[] | Record<string, string | ProviderOptions>;
    strategy?: Strategy;
    expires?: string;
    redirect?: RedirectOption;
    onLogin?: (profile: AuthProfile, ctx: Context) => Awaitable<string | number | undefined>;
    getUser?: (id: string, ctx: Context) => Awaitable<U>;
    toPublicUser?: (user: any) => Awaitable<any>;
    onLogout?: (id: string, ctx: Context) => Awaitable<void>;
};
type AuthVerify<U = AuthClaims> = {
    issuer: string;
    audience: string | readonly string[];
    cookie?: string;
    audienceClaim?: string | readonly string[];
    getUser?: (id: string, ctx: Context) => Awaitable<U>;
};
type AuthInstance = {
    handler: (request: Request) => Awaitable<Response>;
    path?: string;
    user?: (ctx: Context) => Awaitable<any>;
};
type AuthFunction<U = any> = (ctx: Context<any>) => Awaitable<U>;
type AuthOption = string | AuthFunction | AuthConfig<any> | AuthVerify<any> | AuthInstance;
type AuthContext = Pick<Context, "options" | "headers" | "cookies" | "platform" | "app">;
type AuthEntry = {
    name: string;
    user: (ctx: AuthContext) => Promise<any>;
    routes?: () => Router;
};
type AuthSettings = AuthEntry;

type StandardIssue = {
    readonly message: string;
    readonly path?: readonly (PropertyKey | {
        readonly key: PropertyKey;
    })[];
};
interface StandardSchemaV1<Input = unknown, Output = Input> {
    readonly "~standard": {
        readonly version: 1;
        readonly vendor: string;
        readonly validate: (value: unknown) => {
            value: Output;
            issues?: undefined;
        } | {
            issues: readonly StandardIssue[];
        } | Promise<{
            value: Output;
            issues?: undefined;
        } | {
            issues: readonly StandardIssue[];
        }>;
        readonly types?: {
            readonly input: Input;
            readonly output: Output;
        };
    };
}
type SchemaOutput<S, Fallback> = [S] extends [
    StandardSchemaV1<any, infer Output>
] ? Output : Fallback;

type Variables = Record<string, string | string[]>;
type RequestError = Error & {
    code?: string;
    status?: number;
    hint?: string;
    issues?: readonly StandardIssue[];
};
type ExtendError = string | {
    message: string;
    status: number;
    hint?: string;
};
interface ServerErrorConstructor {
    extend(errors: Record<string, ExtendError>): Record<string, ExtendError>;
    [key: string]: ((vars?: Variables) => ServerError) | any;
}
declare class ServerError extends Error {
    code: string;
    status: number;
    hint?: string;
    constructor(code: string, status: number, message: string | ((vars: Variables) => string), vars?: Variables);
    static extend(errors: Record<string, ExtendError>): Record<string, ExtendError>;
}
declare const TypedServerError: typeof ServerError & ServerErrorConstructor;

type CookieOptions = string | string[] | Cookie | Cookie[] | null;
type SendBody = SerializableValue | JSX.Element | Uint8Array | ReadableStream | Readable | Response | Reply$1 | BucketFile | Promise<SendBody>;
interface ResponseData {
    headers: Headers;
    status?: number;
}
declare class Reply$1 {
    res: ResponseData;
    constructor();
    status(status: number): this;
    type(type?: string): this;
    download(name?: string): this;
    headers(key: string | Record<string, string | string[]>, value?: string | string[]): this;
    cache(value: CacheOption): this;
    cookies(key: string | Record<string, CookieOptions>, value?: CookieOptions): this;
    json(body: unknown): Promise<Response>;
    redirect(path: string): Promise<Response>;
    file(path: string | BucketFile): Promise<Response>;
    send(input?: SendBody): Promise<Response>;
}
type Params<K extends keyof Reply$1> = Reply$1[K] extends (...args: infer A) => any ? A : never;
declare const status: (...args: Params<"status">) => Reply$1;
declare const headers: (...args: Params<"headers">) => Reply$1;
declare const type: (...args: Params<"type">) => Reply$1;
declare const cache: (...args: Params<"cache">) => Reply$1;
declare const download: (...args: Params<"download">) => Reply$1;
declare const cookies: (...args: Params<"cookies">) => Reply$1;
declare const send: (...args: Params<"send">) => Promise<Response>;
declare const json: (...args: Params<"json">) => Promise<Response>;
declare const file: (...args: Params<"file">) => Promise<Response>;
declare const redirect: (...args: Params<"redirect">) => Promise<Response>;

type Cookie = {
    value?: string | null;
    path?: string;
    expires?: number | string | Date;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
};

type ExtractPathParams<Path extends string> = Path extends `${string}:${infer Param}(${infer Type})?/${infer Rest}` ? `${Param}:${Type}?` | ExtractPathParams<`/${Rest}`> : Path extends `${string}:${infer Param}(${infer Type})?` ? `${Param}:${Type}?` : Path extends `${string}:${infer Param}(${infer Type})/${infer Rest}` ? `${Param}:${Type}` | ExtractPathParams<`/${Rest}`> : Path extends `${string}:${infer Param}(${infer Type})` ? `${Param}:${Type}` : Path extends `${string}:${infer Param}?/${infer Rest}` ? `${Param}?` | ExtractPathParams<`/${Rest}`> : Path extends `${string}:${infer Param}?` ? `${Param}?` : Path extends `${string}:${infer Param}/${infer Rest}` ? Param | ExtractPathParams<`/${Rest}`> : Path extends `${string}:${infer Param}` ? Param : never;
type ParamTypeMap = {
    string: string;
    number: number;
    date: Date;
};
type InferParamType<T extends string> = T extends keyof ParamTypeMap ? ParamTypeMap[T] : string;
type ParamsToObject<Params extends string> = {
    [K in Params as K extends `${infer Key}:${infer _Type}?` ? Key : K extends `${infer Key}:${infer _Type}` ? Key : K extends `${infer Key}?` ? Key : K]: K extends `${infer _Key}:${infer Type}?` ? InferParamType<Type> | undefined : K extends `${infer _Key}:${infer Type}` ? InferParamType<Type> : K extends `${infer _Key}?` ? string | undefined : string;
};
type PathToParams<Path extends string> = ParamsToObject<ExtractPathParams<Path>>;

type Reply = ReturnType<typeof status>;
type Method = "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "socket";
type ContextTypes = {
    user?: any;
    params?: any;
    query?: any;
    body?: any;
};
type Field<C, K extends keyof ContextTypes, Fallback> = K extends keyof C ? SchemaOutput<C[K], C[K]> : Fallback;
type BodyMode = "parse" | "raw" | "stream";
type CacheOption = string | number | false;
type RouteSchema = {
    tags?: string | string[];
    title?: string;
    description?: string;
};
type RouteOptions = {
    schema?: RouteSchema | false;
    parser?: BodyMode;
    body?: StandardSchemaV1<any, any>;
    query?: StandardSchemaV1<any, any>;
    params?: StandardSchemaV1<any, any>;
    response?: StandardSchemaV1<any, any>;
    cache?: CacheOption;
    uploads?: string | Bucket | UploadOptions | false;
};
type Route = {
    path: string;
    options: Omit<RouteOptions, "uploads"> & {
        uploads?: Settings["uploads"];
    };
    fns: Middleware[];
};
type BasicValue = string | number | boolean | null;
type SerializableValue = BasicValue | {
    [key: string]: SerializableValue;
} | Array<SerializableValue>;
type OnError = (error: RequestError, ctx: Context) => Response | Promise<Response>;
type OnResponse = (response: Response, ctx: Context) => Response | void | Promise<Response | void>;
type Options<A = AuthOption> = {
    port?: number;
    secrets?: string | string[];
    public?: string | Bucket;
    uploads?: string | Bucket | UploadOptions | false;
    cors?: CorsOptions;
    auth?: A;
    openapi?: boolean | string | {
        path?: string;
        title?: string;
        description?: string;
        version?: string;
    };
    onError?: OnError;
    onResponse?: OnResponse;
    log?: LogLevel | boolean;
    security?: boolean | SecurityOptions;
    parser?: BodyMode;
    cache?: CacheOption;
};
type Settings = {
    port: number;
    secrets: string[];
    public?: Bucket;
    uploads?: ({
        bucket: Bucket;
    } & LimitOptions) | null | false;
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
type Platform = {
    provider: string | null;
    runtime: string | null;
    production: boolean;
};
type BunEnv = Record<string, string> & {
    upgrade?: (req: Request, options?: {
        data?: any;
    }) => boolean;
    requestIP?: (req: Request) => {
        address: string;
    } | null;
};
interface ContextExtension {
}
type Context<C extends ContextTypes = {}> = {
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
} & ("body" extends keyof C ? {
    body: Field<C, "body", never>;
} : {
    body?: SerializableValue | Buffer | ReadableStream;
}) & ContextExtension;
type InlineReply = Response | Reply | BucketFile | {
    body: string;
    headers?: Headers;
} | SerializableValue | JSX.Element | Buffer | ReadableStream;
type Middleware<C extends ContextTypes = {}> = (ctx: Context<C>) => InlineReply | Promise<InlineReply> | void | Promise<void>;

declare global {
    var env: Record<string, string | undefined>;
}

declare class ValidationError extends TypedServerError {
    source: "body" | "query" | "params" | "response";
    issues: readonly StandardIssue[];
    constructor(source: "body" | "query" | "params" | "response", issues: readonly StandardIssue[]);
}

declare class Server<C extends ContextTypes = {}> extends Router<C> {
    settings: Settings;
    platform: Platform;
    sockets: WebSocket[];
    websocket: any;
    port?: number;
    constructor(options?: Options);
    self(): this;
    node(): Promise<http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>>;
    fetch(request: Request, env?: BunEnv): Promise<Response>;
    callback(request: Request, context: unknown): Promise<Response>;
    test(): {
        get: (path: string, options?: {
            method?: string;
            signal?: AbortSignal | null;
            headers?: HeadersInit;
            cache?: RequestCache;
            redirect?: RequestRedirect;
            credentials?: RequestCredentials;
            integrity?: string;
            keepalive?: boolean;
            mode?: RequestMode;
            priority?: RequestPriority;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            window?: null;
        }) => Promise<Response>;
        head: (path: string, options?: {
            method?: string;
            signal?: AbortSignal | null;
            headers?: HeadersInit;
            cache?: RequestCache;
            redirect?: RequestRedirect;
            credentials?: RequestCredentials;
            integrity?: string;
            keepalive?: boolean;
            mode?: RequestMode;
            priority?: RequestPriority;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            window?: null;
        }) => Promise<Response>;
        post: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
            method?: string;
            signal?: AbortSignal | null;
            headers?: HeadersInit;
            cache?: RequestCache;
            redirect?: RequestRedirect;
            credentials?: RequestCredentials;
            integrity?: string;
            keepalive?: boolean;
            mode?: RequestMode;
            priority?: RequestPriority;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            window?: null;
        }) => Promise<Response>;
        put: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
            method?: string;
            signal?: AbortSignal | null;
            headers?: HeadersInit;
            cache?: RequestCache;
            redirect?: RequestRedirect;
            credentials?: RequestCredentials;
            integrity?: string;
            keepalive?: boolean;
            mode?: RequestMode;
            priority?: RequestPriority;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            window?: null;
        }) => Promise<Response>;
        patch: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
            method?: string;
            signal?: AbortSignal | null;
            headers?: HeadersInit;
            cache?: RequestCache;
            redirect?: RequestRedirect;
            credentials?: RequestCredentials;
            integrity?: string;
            keepalive?: boolean;
            mode?: RequestMode;
            priority?: RequestPriority;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            window?: null;
        }) => Promise<Response>;
        delete: (path: string, options?: {
            method?: string;
            signal?: AbortSignal | null;
            headers?: HeadersInit;
            cache?: RequestCache;
            redirect?: RequestRedirect;
            credentials?: RequestCredentials;
            integrity?: string;
            keepalive?: boolean;
            mode?: RequestMode;
            priority?: RequestPriority;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            window?: null;
        }) => Promise<Response>;
        options: (path: string, options?: {
            method?: string;
            signal?: AbortSignal | null;
            headers?: HeadersInit;
            cache?: RequestCache;
            redirect?: RequestRedirect;
            credentials?: RequestCredentials;
            integrity?: string;
            keepalive?: boolean;
            mode?: RequestMode;
            priority?: RequestPriority;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            window?: null;
        }) => Promise<Response>;
    };
}
declare function server<U = AuthProfile>(options: Omit<Options, "auth"> & {
    auth: AuthConfig<U>;
}): Server<{
    user: U;
}>;
declare function server(options: Omit<Options, "auth"> & {
    auth: string;
}): Server<{
    user: AuthProfile;
}>;
declare function server<U = AuthClaims>(options: Omit<Options, "auth"> & {
    auth: AuthVerify<U>;
}): Server<{
    user: U;
}>;
declare function server<U>(options: Omit<Options, "auth"> & {
    auth: AuthFunction<U>;
}): Server<{
    user: NonNullable<Awaited<U>>;
}>;
declare function server<C extends ContextTypes = {}>(options?: Options): Server<C>;

export { type AuthClaims, type AuthConfig, type AuthEntry, type AuthFunction, type AuthInstance, type AuthMeta, type AuthOption, type AuthProfile, type AuthSettings, type AuthVerify, type BasicValue, type BodyMode, type Bucket, type BucketFile, type BunEnv, type CacheOption, type Context, type ContextExtension, type ContextTypes, type Cookie, type CorsSettings, type ExtractPathParams, type FileInfo, type InferParamType, type InlineReply, type LogLevel, type Logger, type Method, type Middleware, type Options, type ParamTypeMap, type ParamsToObject, type PathToParams, type Platform, type ProviderOptions, type RedirectOption, type RedirectTargets, type RequestError, type Route, type RouteOptions, type RouteSchema, type SchemaOutput, type SecurityOptions, type SecuritySettings, type SerializableValue, Server, TypedServerError as ServerError, type Settings, type StandardIssue, type StandardSchemaV1, type Strategy, type Time, type UploadOptions, type UploadedFile, ValidationError, cache, cookies, server as default, download, file, headers, json, redirect, router, send, status, type };
