import type { Context, Server } from "..";
import {
  clientIp,
  define,
  parseCookies,
  parseHeaders,
  setBodySource,
} from "../helpers";
import createEvents from "./createEvents";
import isValidMethod from "./isValidMethod";

export default async function createWinter(
  req: Request,
  app: Server,
  // The runtime's server object (e.g. Bun's), used to read the socket IP
  server?: any,
): Promise<Context> {
  const init = performance.now();

  const method = req.method.toLowerCase();
  if (!isValidMethod(method)) {
    throw new Error(`Invalid HTTP method: ${method}`);
  }

  const headers = parseHeaders(req.headers);
  const cookies = parseCookies(headers.cookie);

  const baseUrl = req.url.replace(/\/$/, "") || "/";
  const url = new URL(baseUrl) as Context["url"];
  define(url, "query", (url: URL) =>
    Object.fromEntries(url.searchParams.entries()),
  );

  // Don't read the body yet: handleRequest resolves it once the route (and its
  // `body` mode) is known, so a `stream` route never buffers. req.body is
  // already a web ReadableStream, so no conversion is needed here.
  const source = {
    getBuffer: async () => Buffer.from(await req.arrayBuffer()),
    getStream: () => req.body ?? undefined,
  };

  const events = createEvents();

  const ctx: Context = {
    options: app.settings,
    platform: app.platform,
    url,
    method,
    body: undefined,
    headers,
    cookies,
    session: {},
    init,
    events,
    app,
    ip: clientIp(headers, {
      remoteAddress: server?.requestIP?.(req)?.address || "",
      trustProxy: app.settings.security.trustProxy,
    }),
  };
  setBodySource(ctx, source);
  return ctx;
}
