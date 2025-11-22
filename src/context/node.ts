import type { IncomingMessage } from "node:http";
import { TLSSocket } from "node:tls";
import type { Context, Server } from "..";
import { define, parseBody, parseCookies, parseHeaders } from "../helpers";
import createEvents from "./createEvents";
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
  define(url, "query", (url: URL) =>
    Object.fromEntries(url.searchParams.entries()),
  );

  const rawBody = await new Promise<Buffer<ArrayBuffer>>((resolve, reject) => {
    const body: Uint8Array[] = [];
    req
      .on("data", (chunk: Uint8Array) => body.push(chunk))
      .on("end", () => resolve(Buffer.concat(body)))
      .on("error", reject);
  });
  const body = rawBody
    ? await parseBody(rawBody, headers["content-type"], app.settings.uploads)
    : undefined;

  const events = createEvents();

  return {
    options: app.settings,
    platform: app.platform,
    url,
    method,
    body,
    headers,
    cookies,
    init,
    events,
    app,
  };
}
