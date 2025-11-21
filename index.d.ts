declare global {
    var env: Record<string, any>;
}

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
type KVStore = {
    name: string;
    prefix: (key: string) => KVStore;
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, options?: any) => Promise<void>;
    has: (key: string) => Promise<boolean>;
    del: (key: string) => Promise<void>;
    keys: () => Promise<string[]>;
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
    auth?: any;
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
    cors?: Cors;
    auth?: any;
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
type Context = {
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
type Body = string;
type InlineReply = Response | {
    body: Body;
    headers?: Headers;
} | string | number | undefined;
type Middleware = (ctx: Context) => InlineReply | void;

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

type PathOrMiddle = string | Middleware;
type FullRoute = [RouterMethod, string, ...Middleware[]][];
declare class Router {
    handlers: Record<Method, FullRoute>;
    self(): this;
    handle(method: RouterMethod, path: PathOrMiddle, ...middleware: Middleware[]): this;
    socket(path: string, ...middleware: Middleware[]): this;
    socket(...middleware: Middleware[]): this;
    get(path: string, ...middleware: Middleware[]): this;
    get(...middleware: Middleware[]): this;
    head(path: string, ...middleware: Middleware[]): this;
    head(...middleware: Middleware[]): this;
    post(path: string, ...middleware: Middleware[]): this;
    post(...middleware: Middleware[]): this;
    put(path: string, ...middleware: Middleware[]): this;
    put(...middleware: Middleware[]): this;
    patch(path: string, ...middleware: Middleware[]): this;
    patch(...middleware: Middleware[]): this;
    del(path: string, ...middleware: Middleware[]): this;
    del(...middleware: Middleware[]): this;
    options(path: string, ...middleware: Middleware[]): this;
    options(...middleware: Middleware[]): this;
    use(...middleware: Middleware[]): this;
    use(path: string, ...middleware: Middleware[]): this;
    use(router: Router): this;
    use(path: string, router: Router): this;
}
declare function router(): Router;

declare function server(options?: {}): any;

export { type Body, type Bucket, type Context, type Cors, type InlineReply, type Method, type Middleware, type Options, type Platform, Reply, type RouterMethod, ServerError, type Settings, type Time, cookies, server as default, download, file, headers, json, redirect, router, send, status, type, view };
