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

export type Context = {
  method: Method;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: any;
  url: URL & {
    params: Record<string, string>;
    query: Record<string, string>;
  };
  options: Record<string, string>;
};

export type InlineReply =
  | Response
  | { body: Body; headers?: Headers }
  | string
  | number
  | undefined;

export type Middleware = (ctx: Context) => InlineReply | void;
