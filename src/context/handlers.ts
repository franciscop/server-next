import type { IncomingMessage } from "node:http";
import type { BunEnv, Server } from "..";
import socketUser from "../auth/socketUser";
import handleRequest from "../pipeline/handleRequest";
import parseCookies from "../http/parseCookies";
import parseHeaders from "../http/parseHeaders";
import writeResponse from "./writeResponse";
import { attachWebsocket } from "../ws/wsNode";
import createNode from "./node";
import createWinter from "./winter";

export const Winter = async (app: Server, request: Request, env: BunEnv) => {
  // A WebSocket upgrade (Bun): resolve the auth user from the request and pass
  // it along as the socket's `data`, so handlers see it as `ctx.user`. Only
  // actual upgrade requests are handed to `env.upgrade`; everything else falls
  // through to the normal request pipeline below.
  if (env?.upgrade) {
    const wantsWs =
      String(request.headers.get("upgrade") || "").toLowerCase() ===
      "websocket";
    if (wantsWs) {
      const headers = parseHeaders(request.headers);
      const cookies = parseCookies(headers.cookie);
      // A present-but-invalid credential throws: refuse the upgrade with 401,
      // the same status an HTTP route gives (absent/expired connects anonymously).
      let user: unknown;
      try {
        user = await socketUser(app, headers, cookies);
      } catch {
        return new Response("Unauthorized", { status: 401 });
      }
      if (env.upgrade(request, { data: { user } })) return;
    }
  }
  // The 2nd fetch argument is the env vars on the worker runtimes, but on Bun
  // it is the runtime's Server object (.requestIP/.upgrade). Only real env may
  // be merged into the process env: copying Bun's server onto globalThis.env
  // would pollute it with functions, once per request, forever.
  const isRuntimeServer =
    typeof env?.upgrade === "function" || typeof env?.requestIP === "function";
  if (env && !isRuntimeServer) Object.assign(globalThis.env, env);

  try {
    const ctx = await createWinter(request, app, env);
    return await handleRequest(app, ctx);
  } catch {
    // Building the context itself failed (handleRequest catches its own
    // errors), so there is no ctx for onError: answer with a bare 500
    // rather than letting the rejection escape the runtime's handler.
    return new Response("Server Error", { status: 500 });
  }
};

export const Node = async (app: Server) => {
  const http = await import("node:http");

  const server = http.createServer(
    async (request: IncomingMessage, response) => {
      // Abort `ctx.signal` when the client disconnects before the response is
      // done, so handlers can cancel upstream work (fetches, streams, queries)
      const controller = new AbortController();
      response.on("close", () => {
        if (!response.writableFinished) controller.abort();
      });

      let out: Response;
      try {
        const ctx = await createNode(request, app, controller.signal);
        out = await handleRequest(app, ctx);
      } catch {
        // Building the context itself failed (handleRequest catches its own
        // errors), so there is no ctx for onError: answer with a bare 500
        // instead of leaving the socket hanging with no response at all.
        response.writeHead(500);
        response.end("Server Error");
        return;
      }

      await writeResponse(out, response);
    },
  );

  // WebSockets: handle the HTTP upgrade and bridge to the `.socket()` handlers
  await attachWebsocket(server, app);

  server.listen(app.settings.port, () => {
    app.settings.log.start(`http://localhost:${app.settings.port}/`);
  });

  return server;
};

export const Netlify = async (
  app: Server,
  request: Request,
  // Netlify's own context object; unused, but the platform always passes it
  _context: unknown,
) => {
  try {
    const ctx = await createWinter(request, app);
    return await handleRequest(app, ctx);
  } catch {
    return new Response("Server Error", { status: 500 });
  }
};
