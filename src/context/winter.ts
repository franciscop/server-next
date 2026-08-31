import type { Context, Server } from "..";
import createContext from "./create";

export default async function createWinter(
  req: Request,
  app: Server,
  // The runtime's server object (e.g. Bun's), used to read the socket IP
  server?: any,
): Promise<Context> {
  return createContext(app, {
    method: req.method,
    headers: req.headers,
    url: req.url,
    signal: req.signal,
    remoteAddress: server?.requestIP?.(req)?.address || "",
    source: {
      // req.body is already a web ReadableStream, so no conversion is needed
      getBuffer: async () => Buffer.from(await req.arrayBuffer()),
      getStream: () => req.body ?? undefined,
    },
  });
}
