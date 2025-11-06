import auth from "../auth/index.js";
import { define, parseHeaders } from "../helpers";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";
import type { Context, Method } from "../types.js";
import type { IncomingMessage } from "node:http";

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

interface NodeContext {
  method: Method;
  headers: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: any;
  url: URL & {
    params: Record<string, string>;
    query: Record<string, string>;
  };
  options: any;
  time?: any;
  session?: Record<string, any>;
  auth?: any;
  user?: any;
  res?: {
    headers: Record<string, string>;
    cookies: Record<string, any>;
  };
  req: IncomingMessage;
  on: (name: string, callback: EventCallback) => void;
  trigger: (name: string, data?: any) => void;
  app?: any;
  platform?: any;
  machine?: any;
}

// Headers come like [title1, value1, title2, value2, ...]
// https://stackoverflow.com/a/54029307/938236
const chunkArray = (arr: string[], size: number): string[][] =>
  arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];

export default async (
  request: IncomingMessage & { rawHeaders: string[] },
  app: any,
): Promise<NodeContext | { error: Error }> => {
  try {
    const ctx: NodeContext = {
      headers: {},
      cookies: {},
      url: undefined!,
      options: app.opts || {},
      method: "get",
      req: request,
    } as NodeContext;
    const method = request.method?.toLowerCase() || "get";
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

    ctx.headers = parseHeaders(
      new Headers(chunkArray(request.rawHeaders, 2) as any),
    );
    ctx.cookies = parseCookies(ctx.headers.cookie);
    await auth.load(ctx as Context);

    const https = (request as any).connection?.encrypted ? "https" : "http";
    const host = ctx.headers.host || `localhost:${ctx.options.port}`;
    const path = (request.url || "/").replace(/\/$/, "") || "/";
    ctx.url = new URL(path, `${https}://${host}`) as any;
    define(ctx.url, "query", (url: URL) =>
      Object.fromEntries(url.searchParams.entries()),
    );

    await new Promise<void>((resolve, reject) => {
      const body: Uint8Array[] = [];
      request
        .on("data", (chunk: Uint8Array) => {
          body.push(chunk);
        })
        .on("end", async () => {
          const type = ctx.headers["content-type"];
          const concatenated = Buffer.concat(body);
          ctx.body = await parseBody(
            concatenated.toString(),
            type,
            ctx.options.uploads,
          );
          resolve();
        })
        .on("error", reject);
    });

    ctx.app = app;
    ctx.platform = app.platform;
    ctx.machine = app.platform;

    return ctx;
  } catch (error) {
    return { error: error as Error };
  }
};
