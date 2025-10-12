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
  read: (path: string) => Promise<void>;
  write: (path: string, data: string) => Promise<void>;
  delete: (path: string) => Promise<boolean>;
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
  options: Record<string, string> & {
    public: Bucket;
  };
  time: { (name: string): void; times: [string, number][]; headers: () => {} };
};

export type InlineReply =
  | Response
  | { body: Body; headers?: Headers }
  | string
  | number
  | undefined;

export type Middleware = (ctx: Context) => InlineReply | void;
