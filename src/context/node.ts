import type { IncomingMessage } from "node:http";
import { TLSSocket } from "node:tls";
import type { Context, Server } from "..";
import toWeb from "../util/toWeb";
import createContext from "./create";

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
  const headers = new Headers(chunkArray(req.rawHeaders));
  // The socket only knows whether *this* hop was TLS, which behind a proxy is
  // not what the visitor used; createContext rewrites the URL from Forwarded
  const scheme = req.socket instanceof TLSSocket ? "https" : "http";
  const host = headers.get("host") || `localhost:${app.settings.port}`;

  return createContext(app, {
    method: req.method || "get",
    headers,
    url: `${scheme}://${host}${req.url || "/"}`,
    signal,
    remoteAddress: req.socket.remoteAddress || "",
    source: {
      getBuffer: () =>
        new Promise<Buffer>((resolve, reject) => {
          const chunks: Uint8Array[] = [];
          req
            .on("data", (chunk: Uint8Array) => chunks.push(chunk))
            .on("end", () => resolve(Buffer.concat(chunks)))
            .on("error", reject);
        }),
      // Normalize the node stream to the web ReadableStream every reader expects
      getStream: () => toWeb(req),
    },
  });
}
