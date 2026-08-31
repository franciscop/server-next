import ServerError from "../errors";
import type { Bucket } from "..";
import { INF, tooLarge } from "./bodyLimit";
import { asIterable, endPart, feedPart, makeFilePart } from "./bodyParts";
import parseMultipart, { getBoundary } from "./multipart";
import { parseBytes } from "../util/bytes";
import type { LimitOptions } from "./upload";

// Where files go. `false` means "ignore files, I meant it"; null/undefined mean
// nothing was configured, which is an error as soon as a file arrives.
type Dest = Bucket | ({ bucket: Bucket } & LimitOptions) | null | undefined | false;

type Input = Buffer | ReadableStream;

function toStream(input: Input): ReadableStream {
  if (input instanceof ReadableStream) return input;
  return new ReadableStream({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    },
  });
}

// Buffer a whole body into memory. `max` caps how much we'll accumulate before
// throwing a 413: this is the choke point where non-file bytes enter the heap.
// File paths pass no max, since files are governed by the `uploads` limits,
// not the body limit.
async function toBuffer(input: Input, max: number = INF): Promise<Buffer> {
  if (!(input instanceof ReadableStream)) {
    if (input.length > max) throw tooLarge(max);
    return input;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of asIterable(input)) {
    total += chunk.byteLength;
    if (total > max) throw tooLarge(max);
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// application/x-www-form-urlencoded → object, arraying repeated keys like multipart
function parseUrlEncoded(text: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(text)) {
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[key] = [existing, value];
  }
  return out;
}

// Stream a single raw-body file (e.g. a posted video/mp4) straight to a Bucket,
// counting its size as it flows, so the bytes are never all in memory.
// A raw body is one file. The bytes name it and type it, the same way a
// multipart part is handled, so both paths obey the same limits.
async function streamRawToBucket(
  stream: ReadableStream,
  type: string,
  bucket: Bucket,
  limits: LimitOptions,
): Promise<any> {
  const part = makeFilePart("body", "upload", type, bucket, limits, {
    used: 0,
    max: INF,
    files: 0,
  });
  for await (const chunk of asIterable(stream)) {
    await feedPart(part, Buffer.from(chunk));
  }
  const body: Record<string, any> = {};
  await endPart(part, body);
  return part.size ? body.body : undefined;
}

// Turns a request body into `ctx.body`. Accepts a Buffer or a web ReadableStream
// (the streaming modes pass the stream so files are never fully buffered; the
// buffered call sites and tests pass a Buffer, which is wrapped as a one-chunk
// stream so both go through the exact same parser).
export default async function parseBody(
  input: Input,
  contentType?: string | string[],
  dest?: Dest,
  max: number = INF,
  length?: number,
): Promise<any> {
  const type = Array.isArray(contentType) ? contentType[0] : contentType;

  // Split the destination into the bucket and its limits
  let bucket: Bucket | null | undefined | false;
  let limits: LimitOptions = {};
  if (dest && typeof dest === "object" && "bucket" in dest) {
    bucket = dest.bucket;
    const { maxFileSize, maxTotalSize, maxFiles, minSize, fileType } = dest;
    limits = { maxFileSize, maxTotalSize, maxFiles, minSize, fileType };
  } else {
    bucket = dest as Bucket | null | undefined | false;
  }

  // Multipart (Case A): stream-parse, files go to the bucket as they arrive;
  // only the buffered text fields count against `max`.
  if (type && /multipart\/form-data/i.test(type)) {
    const boundary = getBoundary(type);
    // Malformed per RFC 2046, and it must not fall through: this content type
    // misses every branch below and the raw body would be stored as a file.
    if (!boundary) throw ServerError.BODY_INVALID_MULTIPART();
    return parseMultipart(toStream(input), boundary, bucket, limits, max);
  }

  // Types that need the whole body in hand to make sense of it: all buffered, so
  // all counted against `max`.
  if (!type || /^text\//i.test(type)) {
    const buf = await toBuffer(input, max);
    return buf.length ? buf.toString("utf-8") : undefined;
  }
  // RFC 6839: anything with a "+json" structured syntax suffix is JSON too
  // (JSON:API, JSON-LD, RFC 7807), and the match is anchored so a type that
  // merely contains the word is not treated as one.
  if (/^application\/([\w.+-]+\+)?json\b/i.test(type)) {
    const buf = await toBuffer(input, max);
    return buf.length ? JSON.parse(buf.toString("utf-8")) : undefined;
  }
  if (/application\/x-www-form-urlencoded/i.test(type)) {
    const buf = await toBuffer(input, max);
    return buf.length ? parseUrlEncoded(buf.toString("utf-8")) : undefined;
  }

  // Case B: a single raw file as the whole body (image/*, video/*, octet-stream).
  // With no bucket it becomes ctx.body as a Buffer (buffered → counted); with a
  // bucket it's a file (validated-buffered or streamed) → governed by the
  // `uploads` limits, not the body limit, so uncounted.
  // `false` keeps today's Buffer: files are off, so this is just bytes
  if (bucket === false) {
    const buf = await toBuffer(input, max);
    return buf.length ? buf : undefined;
  }
  // Nothing configured, and this is a file by elimination: say so rather than
  // handing back bytes nobody asked for
  if (!bucket) throw ServerError.UPLOAD_NOT_CONFIGURED({ name: "the request body" });
  // A body that declares itself too large is refused before a byte is written
  const { maxFileSize } = limits;
  if (length != null && maxFileSize != null && length > parseBytes(maxFileSize)) {
    throw ServerError.UPLOAD_TOO_LARGE({
      name: "the request body",
      size: String(length),
      limit: String(maxFileSize),
    });
  }
  return streamRawToBucket(toStream(input), type, bucket, limits);
}
