import auth from "../auth";
import { define, parseHeaders } from "../helpers";
import parseBody from "./parseBody";
import parseCookies from "./parseCookies";
import type { Context, Method } from "..";

type EventCallback = (data: any) => void;

function isValidMethod(method: string): method is Method {
  return [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "socket",
  ].includes(method);
}

interface WinterContext {
  method: Method;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: any;
  url: URL & {
    params: Record<string, string>;
    query: Record<string, string>;
  };
  options: any;
  settings: any;
  time?: any;
  session?: Record<string, any>;
  auth?: any;
  user?: any;
  res?: {
    headers: Record<string, string>;
    cookies: Record<string, any>;
  };
  init: number;
  req: Request;
  on: (name: string, callback: EventCallback) => void;
  trigger: (name: string, data?: any) => void;
  app?: any;
  platform?: any;
  machine?: any;
}

export default async (
  request: Request,
  app: any,
): Promise<WinterContext | { error: Error }> => {
  try {
    const ctx: WinterContext = {
      headers: {},
      cookies: {},
      url: undefined,
      options: app.settings || {},
      method: "get",
      init: performance.now(),
      req: request,
    } as WinterContext;
    const method = request.method.toLowerCase();
    if (!isValidMethod(method)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }
    ctx.method = method;

    // Private
    const events: Record<string, EventCallback[]> = {};
    ctx.on = (name: string, callback: EventCallback) => {
      events[name] = events[name] || [];
      events[name].push(callback);
    };
    ctx.trigger = (name: string, data?: any) => {
      if (!events[name]) return;
      for (const cb of events[name]) {
        cb(data);
      }
    };

    ctx.headers = parseHeaders(request.headers);
    ctx.cookies = parseCookies(ctx.headers.cookie);
    await auth.load(ctx as Context);

    ctx.url = new URL(request.url.replace(/\/$/, "")) as any;
    define(ctx.url, "query", (url: URL) =>
      Object.fromEntries(url.searchParams.entries()),
    );

    if (request.body) {
      const type = ctx.headers["content-type"];
      ctx.body = await parseBody(request, type, ctx.options.uploads);
    }

    ctx.app = app;
    ctx.platform = app.platform;
    ctx.machine = app.platform;

    return ctx;
  } catch (error) {
    return { error: error as Error };
  }
};
