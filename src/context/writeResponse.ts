import type { ServerResponse } from "node:http";
import parseHeaders from "../http/parseHeaders";

// The mirror of toWeb: pump a fetch Response into Node's ServerResponse.
export default async function writeResponse(
  out: Response,
  response: ServerResponse,
): Promise<void> {
  response.writeHead(out.status || 200, parseHeaders(out.headers));
  try {
    if (out.body instanceof ReadableStream) {
      // Cancel the reader on disconnect so the source cleans up, instead
      // of looping forever writing to a dead socket.
      const reader = out.body.getReader();
      response.on("close", () => reader.cancel().catch(() => {}));
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        response.write(value);
      }
    } else {
      response.write(out.body || "");
    }
    response.end();
  } catch {
    // The stream errored after the headers (and maybe some body) were sent,
    // so we can't change the status. Abort the connection so the client sees
    // a truncated/failed response rather than a clean end, and we don't leak
    // an unhandled rejection out of the request callback.
    if (!response.destroyed) response.destroy();
  }
}
