import * as http from 'http';
export { default as kv } from 'polystore';
export { default as bucket } from 'bucket';

type LimitOptions = {
    maxSize?: number | string;
    minSize?: number | string;
    fileType?: string[];
};

type CookieOptions = string | string[] | Cookie | Cookie[] | null;
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
    json(body: unknown): Response;
    redirect(path: string): Response;
    file(path: string | BucketFile): Promise<Response>;
    send(body?: string | Buffer | ReadableStream | any): Response;
}
type Params<K extends keyof Reply$1> = Reply$1[K] extends (...args: infer A) => any ? A : never;
declare const status: (...args: Params<"status">) => Reply$1;
declare const headers: (...args: Params<"headers">) => Reply$1;
declare const type: (...args: Params<"type">) => Reply$1;
declare const cache: (...args: Params<"cache">) => Reply$1;
declare const download: (...args: Params<"download">) => Reply$1;
declare const cookies: (...args: Params<"cookies">) => Reply$1;
declare const send: (...args: Params<"send">) => Response;
declare const json: (...args: Params<"json">) => Response;
declare const file: (...args: Params<"file">) => Promise<Response>;
declare const redirect: (...args: Params<"redirect">) => Response;

type Reply = ReturnType<typeof status>;
type Method = "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "socket";
type ContextTypes = {
    session?: any;
    user?: any;
    params?: any;
    query?: any;
    body?: any;
};
type Field<C, K extends keyof ContextTypes, Fallback> = K extends keyof C ? SchemaOutput<C[K], C[K]> : Fallback;
declare namespace JSX {
    interface Element {
        type: any;
        props: any;
    }
    interface IntrinsicElements {
        [elem: string]: any;
    }
}
type BodyMode = "parse" | "raw" | "stream";
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
type CacheOption = string | number | false;
type RouteSchema = {
    tags?: string | string[];
    title?: string;
    description?: string;
};
type RouteOptions = {
    schema?: RouteSchema;
    parser?: BodyMode;
    body?: StandardSchemaV1<any, any>;
    query?: StandardSchemaV1<any, any>;
    params?: StandardSchemaV1<any, any>;
    response?: StandardSchemaV1<any, any>;
    cache?: CacheOption;
};
type Route = {
    path: string;
    options: RouteOptions;
    fns: Middleware[];
};
type Cookie = {
    value?: string | null;
    path?: string;
    expires?: number | string | Date;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
};
type RouterMethod = "*" | Method;
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
type UploadedFile = {
    name: string;
    path: string;
    type: string;
    size: number;
};
type UploadOptions = LimitOptions & {
    bucket: string | Bucket;
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
type BasicValue = string | number | boolean | null;
type SerializableValue = BasicValue | {
    [key: string]: SerializableValue;
} | Array<SerializableValue>;
type StoreSource = KVStore | Map<string, any> | string | Record<string, any>;
type KVStore = {
    name?: string;
    prefix: (prefix?: string) => KVStore;
    get: <T = SerializableValue>(key: string) => Promise<T | null>;
    set: <T = SerializableValue>(key: string, value: T, options?: {
        expires?: string | number | null;
    }) => Promise<void | string>;
    has: (key: string) => Promise<boolean>;
    del: (key: string) => Promise<void | string>;
    keys: () => Promise<string[]>;
};
type Provider = "email" | "github" | "google" | "microsoft" | "discord" | "facebook" | "apple";
type Strategy = "cookie" | "jwt" | "token";
type AuthSession = {
    user: string;
    provider: Provider;
    created: string;
};
type AuthUser<T = Record<string, any>> = T & {
    id: string | number;
    provider: Provider;
    strategy: Strategy;
    email: string;
};
type ProfileUser = {
    id: string | number;
    email: string;
} & Record<string, any>;
type AuthOption = `${Strategy}:${Provider}` | {
    strategy: Strategy;
    providers?: Provider | Provider[];
    users?: StoreSource;
    redirect?: string;
    onProfile?: (raw: any, provider: Provider) => ProfileUser | Promise<ProfileUser>;
    onLogin?: (loginUser: AuthUser, existingUser: AuthUser | null, ctx: Context) => ProfileUser | Promise<ProfileUser>;
    onUser?: <T = AuthUser>(user: T, ctx: Context) => T | Promise<T>;
    onToken?: (user: AuthUser, ctx: Context) => ProfileUser | Promise<ProfileUser>;
    onLogout?: (ctx: Context) => unknown;
};
type AuthSettings = {
    providers: Provider[];
    strategy: Strategy;
    users: KVStore;
    onProfile?: (raw: any, provider: Provider) => ProfileUser | Promise<ProfileUser>;
    onLogin?: (loginUser: AuthUser, existingUser: AuthUser | null, ctx: Context) => ProfileUser | Promise<ProfileUser>;
    onUser: <T = AuthUser>(user: T, ctx: Context) => T | Promise<T>;
    onToken: (user: AuthUser, ctx: Context) => ProfileUser | Promise<ProfileUser>;
    onLogout?: (ctx: Context) => unknown;
    redirect: string;
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
    maxBody?: number | string | false;
    csp?: boolean | string;
    coop?: boolean | string;
    corp?: boolean | string;
    permissionsPolicy?: string;
};
type SecuritySettings = {
    trustProxy: boolean;
    traversalProtection: boolean;
    maxBody: number;
    headers: Record<string, string>;
    hsts: string | null;
};
type OnError = (error: Error, ctx: Context) => Response | Promise<Response>;
type OnResponse = (response: Response, ctx: Context) => Response | void | Promise<Response | void>;
type Options = {
    port?: number;
    secret?: string;
    public?: string | Bucket;
    uploads?: string | Bucket | UploadOptions;
    sessions?: StoreSource;
    cors?: CorsOptions;
    auth?: AuthOption;
    openapi?: any;
    onError?: OnError;
    onResponse?: OnResponse;
    log?: LogLevel | boolean;
    favicon?: string | BucketFile;
    security?: boolean | SecurityOptions;
    parser?: BodyMode;
    cache?: CacheOption;
};
type Settings = {
    port: number;
    secret: string;
    public?: Bucket;
    uploads?: ({
        bucket: Bucket;
    } & LimitOptions) | null;
    sessions: KVStore;
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
type Time = {
    (name: string): void;
    times: [string, number][];
    headers: () => string;
};
type Platform = {
    provider: string | null;
    runtime: string | null;
    production: boolean;
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
type BunEnv = Record<string, string> & {
    upgrade?: (req: Request, options?: {
        data?: any;
    }) => boolean;
};
interface ContextExtension {
}
type Context<C extends ContextTypes = {}> = {
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
    res?: Response & {
        cookies?: Record<string, string>;
    };
    app: Server;
} & ContextExtension;
type InlineReply = Response | Reply | BucketFile | {
    body: string;
    headers?: Headers;
} | SerializableValue | JSX.Element | Buffer | ReadableStream;
type Body = InlineReply;
type Middleware<C extends ContextTypes = {}> = (ctx: Context<C>) => InlineReply | Promise<InlineReply> | void | Promise<void>;

type Variables = Record<string, string | string[]>;
type ExtendError = string | {
    message: string;
    status: number;
};
interface ServerErrorConstructor {
    extend(errors: Record<string, ExtendError>): Record<string, ExtendError>;
    [key: string]: ((vars?: Variables) => ServerError) | any;
}
declare class ServerError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string | ((vars: Variables) => string), vars?: Variables);
    static extend(errors: Record<string, ExtendError>): Record<string, ExtendError>;
}
declare const TypedServerError: typeof ServerError & ServerErrorConstructor;

declare global {
    var env: Record<string, any>;
}

type Fn<C extends ContextTypes> = (ctx: Context<C>) => ReturnType<Middleware>;
type RouteCtx<C extends ContextTypes, RO extends RouteOptions, Params> = Omit<C, "params" | "query" | "body"> & {
    params: [RO["params"]] extends [StandardSchemaV1<any, any>] ? RO["params"] : Params;
} & Pick<RO, keyof RO & ("query" | "body")>;
type Mids<C extends ContextTypes, Path extends string, RO extends RouteOptions = {}> = Fn<RouteCtx<C, RO, PathToParams<Path>>>[];
type Exact<RO> = RouteOptions & {
    [K in Exclude<keyof RO, keyof RouteOptions>]: never;
};
declare class Router<C extends ContextTypes = {}> {
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

declare class StatusError extends Error {
    status: number;
    constructor(msg: string, status?: number);
}

declare class ValidationError extends StatusError {
    source: "body" | "query" | "params" | "response";
    issues: readonly StandardIssue[];
    constructor(source: "body" | "query" | "params" | "response", issues: readonly StandardIssue[]);
}

declare class Server<C extends ContextTypes = {}> extends Router<C> {
    settings: Settings;
    platform: Platform;
    sockets: any[];
    websocket: any;
    faviconCache?: {
        bytes: Buffer;
        type: string;
        etag: string;
    } | null;
    port?: number;
    constructor(options?: Options);
    self(): this;
    node(): Promise<http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>>;
    fetch(request: Request, env?: BunEnv): Promise<Response>;
    callback(request: Request, context: unknown): Promise<Response>;
    test(): {
        get: (path: string, options?: {
            method?: string;
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
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        head: (path: string, options?: {
            method?: string;
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
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        post: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
            method?: string;
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
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        put: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
            method?: string;
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
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        patch: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
            method?: string;
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
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        delete: (path: string, options?: {
            method?: string;
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
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        options: (path: string, options?: {
            method?: string;
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
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
    };
}
declare function server<C extends ContextTypes = {}>(options?: Options): Server<C>;

export { type AuthOption, type AuthSession, type AuthSettings, type AuthUser, type BasicValue, type Body, type BodyMode, type Bucket, type BucketFile, type BunEnv, type CacheOption, type Context, type ContextExtension, type ContextTypes, type Cookie, type CorsSettings, type ExtractPathParams, type FileInfo, type InferParamType, type InlineReply, type KVStore, type LogLevel, type Logger, type Method, type Middleware, type Options, type ParamTypeMap, type ParamsToObject, type PathToParams, type Platform, type ProfileUser, type Provider, type Route, type RouteOptions, type RouteSchema, type RouterMethod, type SchemaOutput, type SecurityOptions, type SecuritySettings, type SerializableValue, Server, TypedServerError as ServerError, type Settings, type StandardIssue, type StandardSchemaV1, type StoreSource, type Strategy, type Time, type UploadOptions, type UploadedFile, ValidationError, cache, cookies, server as default, download, file, headers, json, redirect, router, send, status, type };
