import auth from "../auth/index.js";
import { define, parseHeaders } from "../helpers/index.js";
import parseBody from "./parseBody.js";
import parseCookies from "./parseCookies.js";
import type { Context } from "../types.js";

type EventCallback = (data: any) => void;

interface WinterContext extends Partial<Context> {
  init: number;
  options: any;
  req: Request;
  res: { status: number | null; headers: Record<string, any>; cookies: Record<string, any> };
  method: string;
  on: (name: string, callback: EventCallback) => void;
  trigger: (name: string, data?: any) => void;
}

export default async (request: Request, app: any): Promise<WinterContext | { error: Error }> => {
  try {
    const ctx: WinterContext = {} as WinterContext;
    ctx.init = performance.now();
    ctx.options = app.opts || {};
    ctx.req = request;
    ctx.res = { status: null, headers: {}, cookies: {} };
    ctx.method = request.method.toLowerCase();

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
