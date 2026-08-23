import type { IncomingMessage } from "node:http";
import { TLSSocket } from "node:tls";
import type { Context, Server } from "..";
import {
  clientIp,
  define,
  forwarded,
  parseCookies,
  parseHeaders,
  setBodySource,
  toWeb,
} from "../helpers";
import isValidMethod from "./isValidMethod";

// Headers come like [title1, value1, title2, value2, ...]
// https://stackoverflow.com/a/54029307/938236
const chunkArray = (arr: string[]): [string, string][] =>
  arr.length > 2
    ? [[arr[0], arr[1]] as const, ...chunkArray(arr.slice(2))]
    : [arr as [string, string]];

export default async function createNode(
  req: IncomingMessage,
  app: Server,
  // Aborted by the caller on client disconnect (IncomingMessage has no signal)
  signal: AbortSignal = new AbortController().signal,
): Promise<Context> {
  const init = performance.now();

  const method = req.method?.toLowerCase() || "get";
  if (!isValidMethod(method)) {
    throw new Error(`Invalid HTTP method: ${method}`);
  }

  const chunks = chunkArray(req.rawHeaders);
  const headers = parseHeaders(new Headers(chunks));
  const cookies = parseCookies(headers.cookie);

  const scheme = req.socket instanceof TLSSocket ? "https" : "http";
  const host = headers.host || `localhost:${app.settings.port}`;
  const path = (req.url || "/").replace(/\/$/, "") || "/";
  const baseUrl = `${scheme}://${host}`;
  const url = new URL(path, baseUrl) as Context["url"];
  // The socket only knows whether *this* hop was TLS, which behind a proxy is
  // not what the visitor used. See the note in the winter adapter.
  forwarded(url, headers, app.settings.security.trustProxy);
  define(url, "query", (url: URL) =>
    Object.fromEntries(url.searchParams.entries()),
  );

  // Don't read the body yet: handleRequest resolves it once the route (and its
  // `body` mode) is known, so a `stream` route never buffers. We just expose the
  // two ways to read req, normalizing the stream to a web ReadableStream (toWeb).
  const source = {
    getBuffer: () =>
      new Promise<Buffer>((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        req
          .on("data", (chunk: Uint8Array) => chunks.push(chunk))
          .on("end", () => resolve(Buffer.concat(chunks)))
          .on("error", reject);
      }),
    getStream: () => toWeb(req),
  };

  const ctx: Context = {
    options: app.settings,
    platform: app.platform,
    url,
    method,
    body: undefined,
    headers,
    cookies,
    signal,
    init,
    app,
    ip: clientIp(headers, {
      remoteAddress: req.socket.remoteAddress || "",
      trustProxy: app.settings.security.trustProxy,
    }),
  };
  setBodySource(ctx, source);
  return ctx;
}
