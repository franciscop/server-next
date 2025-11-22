type Method = "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "socket";
type RouterMethod = "*" | Method;
type Bucket = {
    read: (path: string) => Promise<ReadableStream | null>;
    write: (path: string, data: string | Buffer) => Promise<void | string>;
    delete: (path: string) => Promise<boolean>;
};
type Cors = {
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
    name: string;
    prefix: (key: string) => KVStore;
    get: <T = SerializableValue>(key: string) => Promise<T>;
    set: <T = SerializableValue>(key: string, value: T, options?: Record<string, any>) => Promise<void>;
    has: (key: string) => Promise<boolean>;
    del: (key: string) => Promise<void>;
    keys: () => Promise<string[]>;
};
type AuthOption = string | {
    type?: string | string[];
    provider?: string | string[];
    session?: KVStore;
    store?: KVStore;
    redirect?: string;
    cleanUser?: <T = UserRecord>(user: T) => T | Promise<T>;
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
type UserRecord = {
    email: string;
    password: string;
};
type Auth = {
    id: string;
    store: KVStore;
    type: string;
    user?: string;
    provider: string;
    session: KVStore;
    cleanUser: <T = UserRecord>(user: T) => T | Promise<T>;
    redirect: string;
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
    cors?: Cors;
    auth?: Auth;
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
type Context<Params extends Record<string, string> = Record<string, string>> = {
    method: Method;
    headers: Record<string, string | string[]>;
    cookies: Record<string, string>;
    body?: unknown;
    url: URL & {
        params: Params;
        query: Record<string, string>;
    };
    options: Settings;
    platform: Platform;
    time?: Time;
    session?: Record<string, BasicValue>;
    auth?: Auth;
    user?: UserRecord;
    init: number;
    events: Events;
    req?: Request;
    res?: Response;
    app: Server;
};
type Body = string;
type InlineReply = Response | {
    body: Body;
    headers?: Headers;
} | string | number | undefined;
type Middleware<Params extends Record<string, string> = Record<string, string>> = (ctx: Context<Params>) => InlineReply | void;

type Variables = Record<string, string | string[]>;
type ExtendError = string | {
    message: string;
    status: number;
};
declare class ServerError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string | ((vars: Variables) => string), vars?: Variables);
    static extend(errors: Record<string, ExtendError>): Record<string, ExtendError>;
    static NO_STORE: (vars?: Variables) => ServerError;
    static NO_STORE_WRITE: (vars?: Variables) => ServerError;
    static NO_STORE_READ: (vars?: Variables) => ServerError;
    static AUTH_ARGON_NEEDED: (vars?: Variables) => ServerError;
    static AUTH_INVALID_TYPE: (vars?: Variables) => ServerError;
    static AUTH_INVALID_TOKEN: (vars?: Variables) => ServerError;
    static AUTH_INVALID_COOKIE: (vars?: Variables) => ServerError;
    static AUTH_NO_PROVIDER: (vars?: Variables) => ServerError;
    static AUTH_INVALID_PROVIDER: (vars?: Variables) => ServerError;
    static AUTH_NO_SESSION: (vars?: Variables) => ServerError;
    static AUTH_NO_USER: (vars?: Variables) => ServerError;
    static LOGIN_NO_EMAIL: (vars?: Variables) => ServerError;
    static LOGIN_INVALID_EMAIL: (vars?: Variables) => ServerError;
    static LOGIN_NO_PASSWORD: (vars?: Variables) => ServerError;
    static LOGIN_INVALID_PASSWORD: (vars?: Variables) => ServerError;
    static LOGIN_WRONG_EMAIL: (vars?: Variables) => ServerError;
    static LOGIN_WRONG_PASSWORD: (vars?: Variables) => ServerError;
    static REGISTER_NO_EMAIL: (vars?: Variables) => ServerError;
    static REGISTER_INVALID_EMAIL: (vars?: Variables) => ServerError;
    static REGISTER_NO_PASSWORD: (vars?: Variables) => ServerError;
    static REGISTER_INVALID_PASSWORD: (vars?: Variables) => ServerError;
    static REGISTER_EMAIL_EXISTS: (vars?: Variables) => ServerError;
}

declare global {
    var env: Record<string, any>;
}

type PathOrMiddle = string | Middleware;
type FullRoute = [RouterMethod, string, ...Middleware[]][];
declare class Router {
    handlers: Record<Method, FullRoute>;
    self(): this;
    handle(method: RouterMethod, path: PathOrMiddle, ...middleware: Middleware[]): this;
    socket<Path extends string>(path: Path, ...middleware: Middleware<PathToParams<Path>>[]): this;
    socket(...middleware: Middleware[]): this;
    get<Path extends string>(path: Path, ...middleware: Middleware<PathToParams<Path>>[]): this;
    get(...middleware: Middleware[]): this;
    head<Path extends string>(path: Path, ...middleware: Middleware<PathToParams<Path>>[]): this;
    head(...middleware: Middleware[]): this;
    post<Path extends string>(path: Path, ...middleware: Middleware<PathToParams<Path>>[]): this;
    post(...middleware: Middleware[]): this;
    put<Path extends string>(path: Path, ...middleware: Middleware<PathToParams<Path>>[]): this;
    put(...middleware: Middleware[]): this;
    patch<Path extends string>(path: Path, ...middleware: Middleware<PathToParams<Path>>[]): this;
    patch(...middleware: Middleware[]): this;
    del<Path extends string>(path: Path, ...middleware: Middleware<PathToParams<Path>>[]): this;
    del(...middleware: Middleware[]): this;
    options<Path extends string>(path: Path, ...middleware: Middleware<PathToParams<Path>>[]): this;
    options(...middleware: Middleware[]): this;
    use(...middleware: Middleware[]): this;
    use(path: string, ...middleware: Middleware[]): this;
    use(router: Router): this;
    use(path: string, router: Router): this;
}
declare function router(): Router;

interface ResponseData {
    headers: Record<string, string>;
    cookies: Record<string, {
        value: string;
    } | string>;
    status?: number;
}
declare class Reply {
    res: ResponseData;
    constructor();
    private generateHeaders;
    status(status: number): this;
    type(type?: string): this;
    download(name: string, type?: string): this;
    headers(headers: Record<string, string>): this;
    cookies(cookies: Record<string, {
        value: string;
    } | string>): this;
    json(body: unknown): Response;
    redirect(Location: string): Response;
    file(path: string, renderer?: (data: Buffer) => Promise<Buffer | string>): Promise<Response>;
    view(path: string, renderer?: (data: Buffer) => Promise<Buffer | string>, ctx?: {
        options: {
            views?: {
                read: (path: string) => Promise<Buffer | null>;
            };
        };
    }): Promise<Response>;
    send(body?: string | Buffer | ReadableStream | any): Response;
}

declare const status: (...args: [number]) => Reply;
declare const headers: (...args: [Record<string, string>]) => Reply;
declare const type: (...args: [string?]) => Reply;
declare const download: (...args: [string, string?]) => Reply;
declare const cookies: (...args: [Record<string, {
    value: string;
} | string>]) => Reply;
declare const send: (...args: [string | Buffer | ReadableStream]) => Response;
declare const json: (...args: [unknown]) => Response;
declare const file: (...args: [string, ((data: Buffer) => Promise<Buffer | string>)?]) => Promise<Response>;
declare const redirect: (...args: [string]) => Response;
declare const view: (...args: [string, ((data: Buffer) => Promise<Buffer | string>)?, {
    options: {
        views?: {
            read: (path: string) => Promise<Buffer | null>;
        };
    };
}?]) => Promise<Response>;

declare class Server extends Router {
    settings: Settings;
    platform: Platform;
    sockets: any[];
    websocket: any;
    port?: number;
    constructor(options?: Options);
    self(): this & ((request: any, context?: any) => any);
    node(): Promise<void>;
    fetch(request: Request, env?: BunEnv): Promise<Response>;
    callback(request: Request, context: unknown): Promise<Response>;
    test(): {
        get: (path: string, options?: RequestInit) => Promise<{
            status: number;
            headers: Record<string, string | string[]>;
            body: SerializableValue;
        } | {
            status: number;
            headers: {};
            body: any;
        }>;
        head: (path: string, options?: RequestInit) => Promise<{
            status: number;
            headers: Record<string, string | string[]>;
            body: SerializableValue;
        } | {
            status: number;
            headers: {};
            body: any;
        }>;
        post: (path: string, body?: BodyInit, options?: RequestInit) => Promise<{
            status: number;
            headers: Record<string, string | string[]>;
            body: SerializableValue;
        } | {
            status: number;
            headers: {};
            body: any;
        }>;
        put: (path: string, body?: BodyInit, options?: RequestInit) => Promise<{
            status: number;
            headers: Record<string, string | string[]>;
            body: SerializableValue;
        } | {
            status: number;
            headers: {};
            body: any;
        }>;
        patch: (path: string, body?: BodyInit, options?: RequestInit) => Promise<{
            status: number;
            headers: Record<string, string | string[]>;
            body: SerializableValue;
        } | {
            status: number;
            headers: {};
            body: any;
        }>;
        delete: (path: string, options?: RequestInit) => Promise<{
            status: number;
            headers: Record<string, string | string[]>;
            body: SerializableValue;
        } | {
            status: number;
            headers: {};
            body: any;
        }>;
        options: (path: string, options?: RequestInit) => Promise<{
            status: number;
            headers: Record<string, string | string[]>;
            body: SerializableValue;
        } | {
            status: number;
            headers: {};
            body: any;
        }>;
    };
}
declare function server(options?: {}): Server & ((request: any, context?: any) => any);

export { type Auth, type AuthOption, type BasicValue, type Body, type Bucket, type BunEnv, type Context, type Cors, type EventCallback, type ExtractPathParams, type InferParamType, type InlineReply, type Method, type Middleware, type Options, type ParamTypeMap, type ParamsToObject, type PathToParams, type Platform, Reply, type RouterMethod, type SerializableValue, Server, ServerError, type Settings, type Time, type UserRecord, cookies, server as default, download, file, headers, json, redirect, router, send, status, type, view };
