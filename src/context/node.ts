import auth from "../auth/index.js";
import { define, parseHeaders } from "../helpers/index.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";
import type { Context } from "../types.js";
import type { IncomingMessage } from "node:http";

type EventCallback = (data: any) => void;

interface NodeContext extends Partial<Context> {
  options: any;
  req: IncomingMessage;
  res: { status: number | null; headers: Record<string, any>; cookies: Record<string, any> };
  method: string;
  on: (name: string, callback: EventCallback) => void;
  trigger: (name: string, data?: any) => void;
}

// Headers come like [title1, value1, title2, value2, ...]
// https://stackoverflow.com/a/54029307/938236
const chunkArray = (arr: string[], size: number): string[][] =>
  arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];

export default async (request: IncomingMessage & { rawHeaders: string[] }, app: any): Promise<NodeContext | { error: Error }> => {
  try {
    const ctx: NodeContext = {} as NodeContext;
    ctx.options = app.opts || {};
    ctx.req = request;
    ctx.res = { status: null, headers: {}, cookies: {} };
    ctx.method = request.method?.toLowerCase() || "get";

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

    ctx.headers = parseHeaders(new Headers(chunkArray(request.rawHeaders, 2) as any));
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
      const body: Buffer[] = [];
      request
        .on("data", (chunk: Buffer) => {
          body.push(chunk);
        })
        .on("end", async () => {
          const type = ctx.headers["content-type"];
          ctx.body = await parseBody(
            Buffer.concat(body).toString(),
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
