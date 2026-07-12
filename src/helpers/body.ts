import type { BodyOption, Context } from "../types";
import { INF, resolveMax, tooLarge } from "./bodyLimit";
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
// - stream: hand over the unread web ReadableStream (nothing buffered, no limit)
// - raw:    the full bytes as a Buffer (buffered, so limited)
// - parse:  parsed into fields/files (the default)
//
// The size limit (`max`, default 1mb) caps only the bytes that enter memory:
// full-body buffers and multipart *text* fields. File bytes stream through to
// `uploads` and are exempt — they're bounded by upload().limit(). The counter
// therefore lives at the buffering choke points inside parseBody, not here.
//
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

  // Fast-fail on a declared-too-large body before reading it — but only when
  // Content-Length reflects the bytes we'll actually buffer. Multipart bodies
  // and any upload-enabled request inflate Content-Length with file bytes that
  // stream straight to `uploads`, so we skip the pre-check there and let the
  // per-buffer counter enforce the limit on the buffered portion.
  const contentType = String(ctx.headers["content-type"] || "");
  const isMultipart = /multipart\/form-data/i.test(contentType);
  const declared = Number(ctx.headers["content-length"]);
  const trustDeclared = !isMultipart && !ctx.options.uploads;
  if (max !== INF && trustDeclared && declared > max) throw tooLarge(max);

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
  // written to `uploads` as they arrive instead of being buffered whole.
  const stream = source.getStream();
  if (!stream) return undefined;

  // Tally the bytes flowing past only to backfill Content-Length (for an
  // accurate request log) when the client didn't send it. The size *limit* is
  // enforced inside parseBody, where it can tell buffered bytes from file bytes.
  let size = 0;
  const counted = stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        size += (chunk as Uint8Array).byteLength;
        controller.enqueue(chunk);
      },
    }),
  );
  const parsed = await parseBody(
    counted,
    ctx.headers["content-type"],
    ctx.options.uploads,
    max,
  );
  if (size && !ctx.headers["content-length"]) {
    ctx.headers["content-length"] = String(size);
  }
  return parsed;
}
