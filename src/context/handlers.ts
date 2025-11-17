import { handleRequest, parseHeaders, iterate } from "../helpers";

import createWinterContext from "./winter";
import createNodeContext from "./node";

export const Winter = async function (app, request, env) {
  if (env?.upgrade(request)) return;
  Object.assign(globalThis.env, env); // Extend env with the passed vars

  const ctx = await createWinterContext(request, app);
  if ("error" in ctx) {
    throw ctx.error;
  }
  const res = await handleRequest(app.handlers, ctx);
  ctx.trigger("finish", { ...ctx, res, end: performance.now() });
  return res;
};

export const Node = async function (app) {
  const http = await import("node:http");
  http
    .createServer(async (request, response) => {
      const ctx = await createNodeContext(request, app);
      if ("error" in ctx) {
        throw ctx.error;
      }
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

export const Netlify = async function (app, request, context) {
  // Consider simply renaming to "ctx.next()"
  request.context = context;
  if (typeof Netlify === "undefined") {
    throw new Error("Netlify doesn't exist");
  }
  const ctx = await createWinterContext(request, app);
  if ("error" in ctx) {
    throw ctx.error;
  }
  return await handleRequest(app.handlers, ctx);
};
