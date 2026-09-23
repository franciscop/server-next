import type { IncomingMessage } from "node:http";
import type { BunEnv, Server } from "..";
import socketUser from "../auth/socketUser";
import handleRequest from "../pipeline/handleRequest";
import parseCookies from "../http/parseCookies";
import parseHeaders from "../http/parseHeaders";
import writeResponse from "./writeResponse";
import { attachWebsocket } from "../ws/wsNode";
import chunkArray from "../util/chunkArray";

export const Fetchable = async (
  app: Server<any>,
  request: Request,
  env: BunEnv,
): Promise<Response> => {
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
      // Bun owns the socket from here and discards whatever is returned
      if (env.upgrade(request, { data: { user } })) {
        return new Response(null, { status: 101 });
      }
    }
  }
  // Only Workers pass their env vars as the 2nd argument. Bun passes its
  // Server there and Netlify its request context, and copying either onto
  // globalThis.env would pollute it once per request, forever.
  if (env && app.platform.provider === "cloudflare") {
    Object.assign(globalThis.env, env);
  }

  try {
    const reqInfo = {
      method: request.method,
      headers: request.headers,
      url: request.url,
      signal: request.signal,
      // Bun passes its server here, which is where the socket IP comes from
      remoteAddress: env?.requestIP?.(request)?.address || "",
      body: request.body,
    };
    return await handleRequest(app, reqInfo);
  } catch {
    // Building the context itself failed (handleRequest catches its own
    // errors), so there is no ctx for onError: answer with a bare 500
    // rather than letting the rejection escape the runtime's handler.
    return new Response("Server Error", { status: 500 });
  }
};

// The DOM lib this project compiles against does not declare the static yet
type StreamFrom = { from(source: AsyncIterable<Uint8Array>): ReadableStream };

export const Node = async (app: Server<any>) => {
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
        const headers = new Headers(chunkArray(request.rawHeaders));
        // This hop's scheme; forwarded() swaps in the visitor's behind a proxy
        const tls = (request.socket as { encrypted?: boolean }).encrypted;
        const host = headers.get("host") || `localhost:${app.settings.port}`;
        const reqInfo = {
          method: request.method || "get",
          headers,
          url: `${tls ? "https" : "http"}://${host}${request.url || "/"}`,
          signal: controller.signal,
          remoteAddress: request.socket.remoteAddress || "",
          // Pull-based, so nothing leaves the socket until resolveBody reads it
          body: (ReadableStream as unknown as StreamFrom).from(request),
        };
        out = await handleRequest(app, reqInfo);
      } catch {
        // Building the context itself failed (handleRequest catches its own
        // errors), so there is no ctx for onError: answer with a bare 500
        // instead of leaving the socket hanging with no response at all.
        response.writeHead(500);
        response.end("Server Error");
        return;
      }

      // An abandoned request's socket is already gone: writeResponse sees that
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
