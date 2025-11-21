import { handleRequest, parseHeaders, iterate } from "../helpers";

import createWinter from "./winter";
import createNode from "./node";
import type { IncomingMessage } from "node:http";
import type { BunEnv, Server } from "..";

export const Winter = async (app: Server, request: Request, env: BunEnv) => {
  if (env?.upgrade(request)) return;
  Object.assign(globalThis.env, env); // Extend env with the passed vars

  const ctx = await createWinter(request, app);
  const res = await handleRequest(app.handlers, ctx);
  ctx.events.trigger("finish", { ...ctx, res, end: performance.now() });
  return res;
};

export const Node = async (app: Server) => {
  const http = await import("node:http");
  http
    .createServer(async (request: IncomingMessage, response) => {
      const ctx = await createNode(request, app);
      if ("error" in ctx) throw ctx.error;

      const out = await handleRequest(app.handlers, ctx);

      response.writeHead(out.status || 200, parseHeaders(out.headers));
      if (out.body instanceof ReadableStream) {
        await iterate(out.body, (chunk) => response.write(chunk));
      } else {
        response.write(out.body || "");
      }
      response.end();
    })
    .listen(app.settings.port);
};

export const Netlify = async (
  app: Server,
  request: Request,
  context: unknown,
) => {
  // ?? consider simply renaming to "ctx.next()"
  // request.context = context;
  console.log("Unknown context", context);
  if (typeof Netlify === "undefined") {
    throw new Error("Netlify doesn't exist");
  }
  const ctx = await createWinter(request, app);
  const res = await handleRequest(app.handlers, ctx);
  ctx.events.trigger("finish", { ...ctx, res, end: performance.now() });
  return res;
};
