type Method = "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "socket";
type ServerConfig = {
    User?: Record<string, string | number | boolean | Date | null | undefined>;
};
type RouteOptions = {
    tags?: string | string[];
    title?: string;
    description?: string;
};
type Cookie = {
    value?: string;
    path?: string;
    expires?: number | string | Date;
};
type RouterMethod = "*" | Method;
type Bucket = {
    read: (path: string) => Promise<ReadableStream | null>;
    write: (path: string, data: string | Buffer) => Promise<void | string>;
    delete: (path: string) => Promise<boolean>;
};
type CorsSettings = {
    origin: string | boolean;
    methods: string;
    headers: string;
};
type CorsOptions = boolean | string | string[] | {
    origin?: string | string[];
    methods?: string | Method[];
    headers?: string | string[];
};
type BasicValue = string | number | boolean | null;
type SerializableValue = BasicValue | {
    [key: string]: SerializableValue;
} | Array<SerializableValue>;
type KVStore = {
    name?: string;
    prefix: (key: string) => KVStore;
    get: <T = SerializableValue>(key: string) => Promise<T>;
    set: <T = SerializableValue>(key: string, value: T, options?: {
        expires: string | number;
    }) => Promise<void | string>;
    has: (key: string) => Promise<boolean>;
    del: (key: string) => Promise<void | string>;
    keys: () => Promise<string[]>;
};
type Provider = "email" | "github";
type Strategy = "cookie" | "jwt" | "token";
type AuthSession = {
    id: string;
    provider: Provider;
    strategy: Strategy;
    user: string;
};
type AuthUser<T = object> = T & {
    id: string | number;
    provider: Provider;
    strategy: Strategy;
    email: string;
};
type ProviderString = Provider | `${Provider}|${Provider}`;
type AuthOption = `${Strategy}:${Provider | ProviderString}` | {
    provider: Provider | ProviderString | Provider[];
    strategy: Strategy;
    session?: KVStore;
    store?: KVStore;
    redirect?: string;
    cleanUser?: <T = AuthUser>(user: T) => T | Promise<T>;
};
type AuthSettings = {
    provider: Provider[];
    strategy: Strategy;
    store: KVStore;
    session: KVStore;
    cleanUser: <T = AuthUser>(user: T) => T | Promise<T>;
    redirect: string;
};
type Options = {
    port?: number;
    secret?: string;
    views?: string | Bucket;
    public?: string | Bucket;
    uploads?: string | Bucket;
    store?: KVStore;
    cookies?: KVStore;
    session?: KVStore | {
        store: KVStore;
    };
    cors?: CorsOptions;
    auth?: AuthOption;
    openapi?: any;
};
type Settings = {
    port: number;
    secret: string;
    views?: Bucket;
    public?: Bucket;
    uploads?: Bucket;
    store?: KVStore;
    cookies?: KVStore;
    session?: {
        store: KVStore;
    };
    cors?: CorsSettings;
    auth?: AuthSettings;
    openapi?: any;
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
    upgrade?: (req: Request) => boolean;
};
type EventCallback = (data: Context & SerializableValue) => void;
type Events = Record<string, EventCallback[]> & {
    on?: (key: string, cb: (value?: Context & SerializableValue) => void) => void;
    trigger?: (key: string, value?: Partial<Context & SerializableValue>) => void;
};
type Context<Params extends Record<string, string> = Record<string, string>, O extends ServerConfig = object> = {
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
    user?: O extends {
        User: infer U;
    } ? U & AuthUser : AuthUser;
    init: number;
    events: Events;
    req?: Request;
    res?: Response & {
        cookies?: Record<string, string>;
    };
    app: Server;
};
type InlineReply = Response | {
    body: string;
    headers?: Headers;
} | SerializableValue;
type Body = InlineReply;
type Middleware<O extends ServerConfig = object, Params extends Record<string, string> = Record<string, string>> = (ctx: Context<Params, O>) => InlineReply | Promise<InlineReply> | void | Promise<void>;

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

type Mids<O, Path extends string> = Middleware<O, PathToParams<Path>>[];
type PathOrMiddle<O extends ServerConfig = object> = string | Middleware<O>;
type FullRoute = [RouterMethod, string, ...Middleware[]][];
declare class Router<O extends ServerConfig = object> {
    handlers: Record<Method, FullRoute>;
    self(): this;
    handle(method: RouterMethod, path: PathOrMiddle<O>, ...middleware: Middleware<O>[]): this;
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
    del<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    del<Path extends string>(path: Path, options: RouteOptions, ...middleware: Mids<O, Path>): this;
    del(...middleware: Middleware<O>[]): this;
    del(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    options<Path extends string>(path: Path, ...middleware: Mids<O, Path>): this;
    options<Path extends string>(path: Path, options: RouteOptions, ...mid: Mids<O, Path>): this;
    options(...middleware: Middleware<O>[]): this;
    options(options: RouteOptions, ...middleware: Middleware<O>[]): this;
    use(...middleware: Middleware[]): this;
    use(path: string, ...middleware: Middleware[]): this;
    use(router: Router): this;
    use(path: string, router: Router): this;
}
declare function router(): Router;

type CookieOptions = string | string[] | Cookie | Cookie[] | null;
interface ResponseData {
    headers: Headers;
    status?: number;
}
declare class Reply {
    res: ResponseData;
    constructor();
    status(status: number): this;
    type(type?: string): this;
    download(name?: string): this;
    headers(key: string | Record<string, string>, value?: string): this;
    cookies(key: string | Record<string, CookieOptions>, value?: CookieOptions): this;
    json(body: unknown): Response;
    redirect(path: string): Response;
    file(path: string): Promise<Response>;
    send(body?: string | Buffer | ReadableStream | any): Response;
}
type Params<K extends keyof Reply> = Reply[K] extends (...args: infer A) => any ? A : never;
declare const status: (...args: Params<"status">) => Reply;
declare const headers: (...args: Params<"headers">) => Reply;
declare const type: (...args: Params<"type">) => Reply;
declare const download: (...args: Params<"download">) => Reply;
declare const cookies: (...args: Params<"cookies">) => Reply;
declare const send: (...args: Params<"send">) => Response;
declare const json: (...args: Params<"json">) => Response;
declare const file: (...args: Params<"file">) => Promise<Response>;
declare const redirect: (...args: Params<"redirect">) => Response;

declare class Server<O extends ServerConfig = object> extends Router<O> {
    settings: Settings;
    platform: Platform;
    sockets: any[];
    websocket: any;
    port?: number;
    constructor(options?: Options);
    self(): this;
    node(): Promise<void>;
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
        post: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
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
        put: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
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
        patch: (path: string, body?: string | number | boolean | ArrayBuffer | {
            [key: string]: SerializableValue;
        } | SerializableValue[] | ReadableStream<any> | Blob | ArrayBufferView<ArrayBuffer> | FormData | URLSearchParams, options?: {
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
declare function server<Options>(options?: {}): Server<Options>;

export { type AuthOption, type AuthSession, type AuthSettings, type AuthUser, type BasicValue, type Body, type Bucket, type BunEnv, type Context, type Cookie, type CorsSettings, type EventCallback, type ExtractPathParams, type InferParamType, type InlineReply, type KVStore, type Method, type Middleware, type Options, type ParamTypeMap, type ParamsToObject, type PathToParams, type Platform, type Provider, type RouteOptions, type RouterMethod, type SerializableValue, Server, type ServerConfig, TypedServerError as ServerError, type Settings, type Strategy, type Time, cookies, server as default, download, file, headers, json, redirect, router, send, status, type };
