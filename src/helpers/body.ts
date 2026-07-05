import type { BodyOption, Context } from "../types";
import parseBody from "./parseBody";
import StatusError from "./StatusError";
import { parseBytes } from "./upload";

const INF = Number.POSITIVE_INFINITY;
const resolveMax = (max: number | string | false | undefined): number =>
  max === false || max == null ? INF : parseBytes(max);
const tooLarge = (max: number) =>
  new StatusError(`Request body exceeds the ${max}-byte limit`, 413);

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
export async function resolveBody(
  ctx: Context,
  body: BodyOption,
): Promise<any> {
  const source = sources.get(ctx);
  if (!source) return undefined;

  const mode = typeof body === "string" ? body : (body?.mode ?? "parse");
  const max = resolveMax(typeof body === "object" ? body?.max : undefined);

  // Reject up front when the client declares a body larger than the limit, so we
  // never start reading an oversized request (works for every mode).
  const declared = Number(ctx.headers["content-length"]);
  if (max !== INF && declared > max) throw tooLarge(max);

  if (mode === "stream") return source.getStream();

  if (mode === "raw") {
    const raw = await source.getBuffer();
    if (raw.length > max) throw tooLarge(max);
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
        // Enforce the limit as bytes flow, so a chunked/undeclared body can't
        // slip past the Content-Length pre-check.
        if (size > max) return controller.error(tooLarge(max));
        controller.enqueue(chunk);
      },
    }),
  );
  const parsed = await parseBody(
    counted,
    ctx.headers["content-type"],
    ctx.options.uploads,
  );
  if (size && !ctx.headers["content-length"]) {
    ctx.headers["content-length"] = String(size);
  }
  return parsed;
}
