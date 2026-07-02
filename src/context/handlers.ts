import { handleRequest, iterate, parseHeaders } from "../helpers";

import type { IncomingMessage } from "node:http";
import type { BunEnv, Server } from "..";
import createNode from "./node";
import createWinter from "./winter";

export const Winter = async (app: Server, request: Request, env: BunEnv) => {
  if (env?.upgrade(request)) return;
  Object.assign(globalThis.env, env); // Extend env with the passed vars

  // In Bun, the 2nd fetch arg is the server object (with .requestIP/.upgrade)
  const ctx = await createWinter(request, app, env);
  const res = await handleRequest(app, ctx);
  return res;
};

export const Node = async (app: Server) => {
  const http = await import("node:http");
  const { attachWebsocket } = await import("../helpers/wsNode");

  const server = http.createServer(
    async (request: IncomingMessage, response) => {
      const ctx = await createNode(request, app);
      if ("error" in ctx) throw ctx.error;

      const out = await handleRequest(app, ctx);

      response.writeHead(out.status || 200, parseHeaders(out.headers));
      if (out.body instanceof ReadableStream) {
        await iterate(out.body, (chunk) => response.write(chunk));
      } else {
        response.write(out.body || "");
      }
      response.end();
    },
  );

  // WebSockets: handle the HTTP upgrade and bridge to the `.socket()` handlers
  attachWebsocket(server, app);

  server.listen(app.settings.port, () => {
    app.settings.log.start(`http://localhost:${app.settings.port}/`);
  });

  return server;
};

export const Netlify = async (
  app: Server,
  request: Request,
  context: unknown,
) => {
  // ?? consider simply renaming to "ctx.next()"
  // @ts-expect-error
  request.context = context;
  if (typeof Netlify === "undefined") {
    throw new Error("Netlify doesn't exist");
  }
  const ctx = await createWinter(request, app);
  const res = await handleRequest(app, ctx);
  return res;
};
