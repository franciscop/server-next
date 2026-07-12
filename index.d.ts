import * as http from 'http';

type LimitOptions = {
    maxSize?: number | string;
    minSize?: number | string;
    fileType?: string[];
};
declare class UploadPipeline {
    private _bucket;
    private _limits;
    constructor(bucket?: Bucket | string | null);
    limit(options: LimitOptions): this;
    store(bucket: Bucket | string): this;
    processFile(originalName: string, data: Buffer, contentType: string): Promise<UploadedFile>;
}
declare function upload(bucket?: Bucket | string | null): UploadPipeline;

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
    headers(key: string | Record<string, string>, value?: string): this;
    cache(value: CacheOption): this;
    cookies(key: string | Record<string, CookieOptions>, value?: CookieOptions): this;
    json(body: unknown): Response;
    redirect(path: string): Response;
    file(path: string): Promise<Response>;
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
type ServerConfig<Session = {}, User = {}> = {
    Session?: Session;
    User?: User;
};
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
type BodyOption = BodyMode | {
    mode?: BodyMode;
    max?: number | string | false;
};
type CacheOption = string | number | false;
type RouteOptions = {
    tags?: string | string[];
    title?: string;
    description?: string;
    body?: BodyOption;
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
    exists: boolean;
    size: number;
    date: Date | null;
    type?: string | null;
};
type BucketFile = {
    readonly path: string;
    readonly id: string;
    readonly name: string;
    exists(): Promise<boolean>;
    info?(): Promise<FileInfo>;
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
    id: string;
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
type BasicValue = string | number | boolean | null;
type SerializableValue = BasicValue | {
    [key: string]: SerializableValue;
} | Array<SerializableValue>;
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
type Strategy = "cookie" | "jwt" | "token" | "key";
type AuthSession = {
    id: string;
    provider: Provider;
    strategy: Strategy;
    user: string;
};
type AuthUser<T = Record<string, any>> = T & {
    id: string | number;
    provider: Provider;
    strategy: Strategy;
    email: string;
};
type AuthOption = `${Strategy}:${Provider}` | "key" | {
    strategy: Strategy;
    providers?: Provider | Provider[];
    key?: string;
    session?: KVStore;
    store?: KVStore;
    redirect?: string;
    cleanUser?: <T = AuthUser>(user: T) => T | Promise<T>;
};
type AuthSettings = {
    providers: Provider[];
    strategy: Strategy;
    store: KVStore;
    session: KVStore;
    key?: string;
    cleanUser: <T = AuthUser>(user: T) => T | Promise<T>;
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
    csp?: boolean | string;
    coop?: boolean | string;
    corp?: boolean | string;
    permissionsPolicy?: string;
};
type SecuritySettings = {
    trustProxy: boolean;
    headers: Record<string, string>;
    hsts: string | null;
};
type OnError = (error: Error, ctx: Context) => Response | Promise<Response>;
type OnResponse = (response: Response, ctx: Context) => Response | void | Promise<Response | void>;
type Options = {
    port?: number;
    secret?: string;
    public?: string | Bucket;
    uploads?: string | Bucket | UploadPipeline;
    store?: KVStore;
    cookies?: KVStore;
    session?: KVStore | {
        store: KVStore;
    };
    cors?: CorsOptions;
    auth?: AuthOption;
    openapi?: any;
    onError?: OnError;
    onResponse?: OnResponse;
    log?: LogLevel | boolean;
    favicon?: string | BucketFile;
    security?: boolean | SecurityOptions;
    body?: BodyOption;
    cache?: CacheOption;
};
type Settings = {
    port: number;
    secret: string;
    public?: Bucket;
    uploads?: Bucket | UploadPipeline;
    store?: KVStore;
    cookies?: KVStore;
    session?: {
        store: KVStore;
    };
    cors?: CorsSettings;
    auth?: AuthSettings;
    openapi?: any;
    onError?: OnError;
    onResponse?: OnResponse;
    log: Logger;
    favicon?: string | BucketFile;
    security: SecuritySettings;
    body: BodyOption;
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
type Context<Params extends Record<string, string | undefined> = Record<string, string>, O extends ServerConfig = object> = {
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
    session: O extends {
        Session?: infer S;
    } ? S extends Record<"Session", infer Inner> ? Inner : Record<string, any> : Record<string, any>;
    user?: O extends {
        User?: infer U;
    } ? U extends Record<"User", infer Inner> ? Inner : AuthUser : AuthUser;
    init: number;
    req?: Request;
    res?: Response & {
        cookies?: Record<string, string>;
    };
    app: Server;
};
type InlineReply = Response | Reply | {
    body: string;
    headers?: Headers;
} | SerializableValue | JSX.Element | Buffer | ReadableStream;
type Body = InlineReply;
type Middleware<O extends ServerConfig = object, Params extends Record<string, string | undefined> = Record<string, string>> = (ctx: Context<Params, O>) => InlineReply | Promise<InlineReply> | void | Promise<void>;

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

type Mids<O extends ServerConfig, Path extends string> = Middleware<O, PathToParams<Path>>[];
declare class Router<O extends ServerConfig = object> {
    middleware: Middleware[];
    handlers: Record<Method, Route[]>;
    self(): this;
    handle(method: Method, pathOrFn?: any, ...rest: any[]): this;
    socket<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    socket<Path extends string>(path: Path, options: RouteOptions, ...middleware: Mids<O, Path>): this;
    socket(...middleware: Middleware<O>[]): this;
    socket(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    get<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    get<Path extends string>(path: Path, options: RouteOptions, ...middleware: Mids<O, Path>): this;
    get(...middleware: Middleware<O>[]): this;
    get(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    head<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    head<Path extends string>(path: Path, options: RouteOptions, ...middleware: Mids<O, Path>): this;
    head(...middleware: Middleware<O>[]): this;
    head(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    post<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    post<Path extends string>(path: Path, options: RouteOptions, ...middleware: Mids<O, Path>): this;
    post(...middleware: Middleware<O>[]): this;
    post(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    put<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    put<Path extends string>(path: Path, options: RouteOptions, ...middleware: Mids<O, Path>): this;
    put(...middleware: Middleware<O>[]): this;
    put(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    patch<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    patch<Path extends string>(path: Path, options: RouteOptions, ...middleware: Mids<O, Path>): this;
    patch(...middleware: Middleware<O>[]): this;
    patch(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    delete<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    delete<Path extends string>(path: Path, options: RouteOptions, ...middleware: Mids<O, Path>): this;
    delete(...middleware: Middleware<O>[]): this;
    delete(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    options<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    options<Path extends string>(path: Path, options: RouteOptions, ...mid: Mids<O, Path>): this;
    options(...middleware: Middleware<O>[]): this;
    options(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    use(...middleware: Middleware[]): this;
    use(router: Router): this;
}
declare function router(): Router;

declare class Server<O extends ServerConfig = {}> extends Router<O> {
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
            cache?: RequestCache;
            credentials?: RequestCredentials;
            headers?: HeadersInit;
            integrity?: string;
            keepalive?: boolean;
            method?: string;
            mode?: RequestMode;
            priority?: RequestPriority;
            redirect?: RequestRedirect;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        head: (path: string, options?: {
            cache?: RequestCache;
            credentials?: RequestCredentials;
            headers?: HeadersInit;
            integrity?: string;
            keepalive?: boolean;
            method?: string;
            mode?: RequestMode;
            priority?: RequestPriority;
            redirect?: RequestRedirect;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        post: (path: string, body?: string | number | boolean | ArrayBuffer | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams | {
            [key: string]: SerializableValue;
        } | SerializableValue[], options?: {
            cache?: RequestCache;
            credentials?: RequestCredentials;
            headers?: HeadersInit;
            integrity?: string;
            keepalive?: boolean;
            method?: string;
            mode?: RequestMode;
            priority?: RequestPriority;
            redirect?: RequestRedirect;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        put: (path: string, body?: string | number | boolean | ArrayBuffer | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams | {
            [key: string]: SerializableValue;
        } | SerializableValue[], options?: {
            cache?: RequestCache;
            credentials?: RequestCredentials;
            headers?: HeadersInit;
            integrity?: string;
            keepalive?: boolean;
            method?: string;
            mode?: RequestMode;
            priority?: RequestPriority;
            redirect?: RequestRedirect;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        patch: (path: string, body?: string | number | boolean | ArrayBuffer | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams | {
            [key: string]: SerializableValue;
        } | SerializableValue[], options?: {
            cache?: RequestCache;
            credentials?: RequestCredentials;
            headers?: HeadersInit;
            integrity?: string;
            keepalive?: boolean;
            method?: string;
            mode?: RequestMode;
            priority?: RequestPriority;
            redirect?: RequestRedirect;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        delete: (path: string, options?: {
            cache?: RequestCache;
            credentials?: RequestCredentials;
            headers?: HeadersInit;
            integrity?: string;
            keepalive?: boolean;
            method?: string;
            mode?: RequestMode;
            priority?: RequestPriority;
            redirect?: RequestRedirect;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
        options: (path: string, options?: {
            cache?: RequestCache;
            credentials?: RequestCredentials;
            headers?: HeadersInit;
            integrity?: string;
            keepalive?: boolean;
            method?: string;
            mode?: RequestMode;
            priority?: RequestPriority;
            redirect?: RequestRedirect;
            referrer?: string;
            referrerPolicy?: ReferrerPolicy;
            signal?: AbortSignal | null;
            window?: null;
        }) => Promise<Response>;
    };
}
declare function server<Session extends Record<string, any> = {}, User extends Record<string, any> = {}>(options?: Options): Server<ServerConfig<Session, User>>;

export { type AuthOption, type AuthSession, type AuthSettings, type AuthUser, type BasicValue, type Body, type BodyMode, type BodyOption, type Bucket, type BucketFile, type BunEnv, type CacheOption, type Context, type Cookie, type CorsSettings, type ExtractPathParams, type FileInfo, type InferParamType, type InlineReply, type KVStore, type LimitOptions, type LogLevel, type Logger, type Method, type Middleware, type Options, type ParamTypeMap, type ParamsToObject, type PathToParams, type Platform, type Provider, type Route, type RouteOptions, type RouterMethod, type SecurityOptions, type SecuritySettings, type SerializableValue, Server, type ServerConfig, TypedServerError as ServerError, type Settings, type Strategy, type Time, UploadPipeline, type UploadedFile, cache, cookies, server as default, download, file, headers, json, redirect, router, send, status, type, upload };
