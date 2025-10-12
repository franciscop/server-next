import { handleRequest } from "../helpers";

import createWinterContext from "./winter";
import createNodeContext from "./node";

export const Winter = async function (request, env) {
  if (env?.upgrade(request)) return;
  Object.assign(globalThis.env, env); // Extend env with the passed vars

  const ctx = await createWinterContext(request, this);
  const res = await handleRequest(this.handlers, ctx);
  ctx?.trigger?.("finish", { ...ctx, res, end: performance.now() });
  return res;
};

export const Node = async function () {
  const http = await import("node:http");
  http
    .createServer(async (request, response) => {
      const ctx = await createNodeContext(request, this);
      const out = await handleRequest(this.handlers, ctx);

      response.writeHead(out.status || 200, parseHeaders(out.headers));
      if (out.body instanceof ReadableStream) {
        await iterate(out.body, (chunk) => response.write(chunk));
      } else {
        response.write(out.body || "");
      }
      response.end();
    })
    .listen(this.opts.port);
};

export const Netlify = async function (request, context) {
  // Consider simply renaming to "ctx.next()"
  request.context = context;
  if (typeof Netlify === "undefined") {
    throw new Error("Netlify doesn't exist");
  }
  const ctx = await createWinterContext(request, this);
  return await handleRequest(this.handlers, ctx);
};
