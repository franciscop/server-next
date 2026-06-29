import type { BodyMode, Context } from "../types";
import parseBody from "./parseBody";

// The runtime-specific way to read the request body, attached by each context
// builder (node.ts / winter.ts) and consumed once by resolveBody. Kept off the
// public Context type via a WeakMap so handlers only ever see ctx.body.
export type BodySource = {
  getBuffer: () => Promise<Buffer>;
  getStream: () => ReadableStream | undefined;
};

const sources = new WeakMap<Context, BodySource>();

export function setBodySource(ctx: Context, source: BodySource): void {
  sources.set(ctx, source);
}

// Read the body the way the resolved `body` mode asks for it:
// - stream: hand over the unread web ReadableStream (nothing buffered)
// - raw:    the full bytes as a Buffer
// - parse:  parsed into fields/files (the default)
// This runs at dispatch (after routing) so a per-route mode can take effect and
// a `stream` route never buffers. Both builders normalize getStream() to a web
// ReadableStream, so ctx.body is the same shape on Node and the web runtimes.
export async function resolveBody(ctx: Context, mode: BodyMode): Promise<any> {
  const source = sources.get(ctx);
  if (!source) return undefined;

  if (mode === "stream") return source.getStream();

  if (mode === "raw") {
    const raw = await source.getBuffer();
    if (!raw.length) return undefined;
    // Reflect the real received size when the client didn't send Content-Length
    // (e.g. chunked uploads), so ctx.headers and the request log are accurate.
    if (!ctx.headers["content-length"]) {
      ctx.headers["content-length"] = String(raw.length);
    }
    return raw;
  }

  // parse: hand parseBody the stream so multipart and raw-file uploads are
  // written to `uploads` as they arrive instead of being buffered whole. JSON,
  // text and url-encoded bodies are small and get collected inside parseBody.
  const stream = source.getStream();
  if (!stream) return undefined;

  // Count the bytes flowing past so we can still backfill Content-Length (for an
  // accurate request log) when the client didn't send it, without buffering.
  let size = 0;
  const counted = stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        size += (chunk as Uint8Array).byteLength;
        controller.enqueue(chunk);
      },
    }),
  );
  const body = await parseBody(
    counted,
    ctx.headers["content-type"],
    ctx.options.uploads,
  );
  if (size && !ctx.headers["content-length"]) {
    ctx.headers["content-length"] = String(size);
  }
  return body;
}
