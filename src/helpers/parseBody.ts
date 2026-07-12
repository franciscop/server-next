import type { Bucket, BucketFile } from "..";
import { INF, tooLarge } from "./bodyLimit";
import createId from "./createId";
import mimes from "./mimes";
import { getExt, UploadPipeline } from "./upload";

type Dest = Bucket | UploadPipeline | null | undefined;
type Input = Buffer | ReadableStream;

function getBoundary(header?: string): string | null {
  if (!header) return null;

  if (header.includes("multipart/form-data") && !header.includes("boundary=")) {
    console.error("Do not set the `Content-Type` manually for FormData");
  }

  const items = header.split(";");
  for (const item of items) {
    const trimmedItem = item.trim();
    if (trimmedItem.startsWith("boundary=")) {
      return trimmedItem.split("=")[1].trim();
    }
  }
  return null;
}

function getMatching(string: string, regex: RegExp): string {
  const matches = string.match(regex);
  return matches?.[1] ?? "";
}

// Simple heuristic to guess if a buffer is text
function isProbablyText(buffer: Buffer): boolean {
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    const byte = buffer[i];
    if (byte === 0) return false; // null byte → binary
    if (byte < 0x07 || (byte > 0x0d && byte < 0x20)) return false;
  }
  return true;
}

// helpers/mimes.ts maps extension → MIME; reverse it (last mapping wins, so the
// canonical extension like `jpg`/`html` beats `jpeg`/`htm`) to name a raw
// single-file body that has no filename of its own.
const extByMime: Record<string, string> = {};
for (const ext in mimes) extByMime[mimes[ext]] = ext;

// Content-type → extension. Falls back to the subtype, then ".bin".
function extFromType(type: string): string {
  const base = (type || "").split(";")[0].trim().toLowerCase();
  const ext = extByMime[base];
  if (ext) return `.${ext}`;
  const sub = base.split("/")[1];
  return sub && /^[a-z0-9]+$/.test(sub) ? `.${sub}` : ".bin";
}

const asIterable = (s: ReadableStream) => s as AsyncIterable<Uint8Array>;

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
// throwing a 413 — this is the choke point where non-file bytes enter the heap.
// File paths (pipeline/bucket) pass no max, since files are governed by
// upload().limit(), not the body limit.
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

// A repeated field name collects its values into an array, whether they are text
// fields (e.g. checkboxes) or files (e.g. a gallery). The first value is kept as
// a scalar; a second occurrence turns it into an array.
function addField(body: Record<string, any>, name: string, value: any): void {
  if (body[name] === undefined) {
    body[name] = value;
    return;
  }
  if (!Array.isArray(body[name])) body[name] = [body[name]];
  body[name].push(value);
}

// One part of a multipart body. A text field and a pipeline-bound file buffer
// their bytes (a pipeline must see the whole file to validate it); a file bound
// to a plain Bucket streams straight through, so its bytes are never all in
// memory at once. A file with no destination, or a nameless part, is drained.
type Part =
  | { kind: "skip" }
  | { kind: "text"; name: string; chunks: Buffer[] }
  | { kind: "drop" }
  | {
      kind: "pipefile";
      name: string;
      filename: string;
      type: string;
      pipeline: UploadPipeline;
      chunks: Buffer[];
    }
  | {
      kind: "file";
      name: string;
      filename: string;
      type: string;
      id: string;
      controller: ReadableStreamDefaultController;
      file: BucketFile;
      write: Promise<void>;
      size: number;
    };

function startPart(headerStr: string, dest: Dest): Part {
  const name = getMatching(headerStr, /name="(.+?)"/)
    .trim()
    .replace(/\[\]$/, "");
  if (!name) return { kind: "skip" };

  const filename = getMatching(headerStr, /filename="(.+?)"/).trim();
  if (!filename) return { kind: "text", name, chunks: [] };

  const type =
    getMatching(headerStr, /Content-Type:\s*([^\r\n]+)/i).trim() ||
    "application/octet-stream";

  if (!dest) return { kind: "drop" };
  if (dest instanceof UploadPipeline) {
    return { kind: "pipefile", name, filename, type, pipeline: dest, chunks: [] };
  }

  // Plain Bucket: open a stream now and pipe the part's bytes into it as they
  // arrive, so a large file is never fully buffered.
  const id = `${createId()}${getExt(filename)}`;
  let controller!: ReadableStreamDefaultController;
  const readable = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  const file = dest.file(id);
  return {
    kind: "file",
    name,
    filename,
    type,
    id,
    controller,
    file,
    write: file.write(readable, { type }),
    size: 0,
  };
}

function feedPart(part: Part, data: Buffer): void {
  if (data.length === 0) return;
  if (part.kind === "text" || part.kind === "pipefile") part.chunks.push(data);
  else if (part.kind === "file") {
    part.controller.enqueue(data);
    part.size += data.length;
  }
}

async function endPart(part: Part, body: Record<string, any>): Promise<void> {
  if (part.kind === "text") {
    const buf = Buffer.concat(part.chunks);
    const value = isProbablyText(buf) ? buf.toString("utf-8").trim() : buf;
    addField(body, part.name, value);
  } else if (part.kind === "pipefile") {
    const buf = Buffer.concat(part.chunks);
    const ref = await part.pipeline.processFile(part.filename, buf, part.type);
    addField(body, part.name, ref);
  } else if (part.kind === "file") {
    part.controller.close();
    await part.write;
    addField(body, part.name, {
      name: part.filename,
      id: part.id,
      path: part.file.path,
      type: part.type,
      size: part.size,
    });
  }
}

const BREAK = Buffer.from("\r\n\r\n");

// A streaming multipart/form-data parser. It scans for the boundary delimiter
// across chunk borders, keeping only a small tail when one might be split, so
// file parts flow to their destination instead of being collected in memory.
async function parseMultipart(
  stream: ReadableStream,
  boundary: string,
  dest: Dest,
  max: number = INF,
): Promise<Record<string, any>> {
  // Every part is preceded by `\r\n--boundary`. Prepend a CRLF so the very first
  // boundary (which has none) matches the same delimiter as the rest.
  const delim = Buffer.from(`\r\n--${boundary}`);
  const body: Record<string, any> = {};
  let buf = Buffer.from("\r\n");
  let state: "boundary" | "headers" | "body" = "boundary";
  let part: Part | null = null;

  // Only text fields are buffered into memory (files stream to `dest`), so only
  // their cumulative size counts against the body limit.
  let textBytes = 0;
  const feed = (p: Part, data: Buffer): void => {
    if (p.kind === "text") {
      textBytes += data.length;
      if (textBytes > max) throw tooLarge(max);
    }
    feedPart(p, data);
  };

  for await (const chunk of asIterable(stream)) {
    buf = Buffer.concat([buf, Buffer.from(chunk)]);

    let advanced = true;
    while (advanced) {
      advanced = false;

      if (state === "boundary") {
        const i = buf.indexOf(delim);
        if (i === -1) {
          // Drop preamble/epilogue, but keep a possible partial delimiter tail
          if (buf.length >= delim.length) {
            buf = buf.subarray(buf.length - delim.length + 1);
          }
          break;
        }
        // Need the two bytes after the delimiter: "--" ends the body, "\r\n"
        // starts the next part's headers.
        if (buf.length < i + delim.length + 2) break;
        const after = i + delim.length;
        if (buf[after] === 0x2d && buf[after + 1] === 0x2d) return body; // "--"
        buf = buf.subarray(after + 2);
        state = "headers";
        advanced = true;
      } else if (state === "headers") {
        const i = buf.indexOf(BREAK);
        if (i === -1) break;
        part = startPart(buf.subarray(0, i).toString("utf-8"), dest);
        buf = buf.subarray(i + BREAK.length);
        state = "body";
        advanced = true;
      } else {
        const i = buf.indexOf(delim);
        if (i === -1) {
          // No delimiter yet: flush all but the tail that might be a split one
          const safe = buf.length - (delim.length - 1);
          if (safe > 0 && part) {
            feed(part, buf.subarray(0, safe));
            buf = buf.subarray(safe);
          }
          break;
        }
        if (part) {
          feed(part, buf.subarray(0, i));
          await endPart(part, body);
          part = null;
        }
        buf = buf.subarray(i); // leave the delimiter for the boundary state
        state = "boundary";
        advanced = true;
      }
    }
  }

  // Tolerate a body that ends without a closing boundary
  if (part) await endPart(part, body);
  return body;
}

// Stream a single raw-body file (e.g. a posted video/mp4) straight to a Bucket,
// counting its size as it flows, so the bytes are never all in memory.
async function streamToBucket(
  stream: ReadableStream,
  type: string,
  bucket: Bucket,
): Promise<any> {
  const id = `${createId()}${extFromType(type)}`;
  const file = bucket.file(id);
  let size = 0;
  let controller!: ReadableStreamDefaultController;
  const readable = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  const write = file.write(readable, { type });
  for await (const chunk of asIterable(stream)) {
    controller.enqueue(chunk);
    size += chunk.byteLength;
  }
  controller.close();
  await write;
  if (!size) return undefined;
  return { name: id, id, path: file.path, type, size };
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
): Promise<any> {
  const type = Array.isArray(contentType) ? contentType[0] : contentType;

  // Multipart (Case A): stream-parse, files go to `dest` as they arrive; only
  // the buffered text fields count against `max`.
  const boundary =
    type && /multipart\/form-data/i.test(type) ? getBoundary(type) : null;
  if (boundary) return parseMultipart(toStream(input), boundary, dest, max);

  // Types that need the whole body in hand to make sense of it: all buffered, so
  // all counted against `max`.
  if (!type || /^text\//i.test(type)) {
    const buf = await toBuffer(input, max);
    return buf.length ? buf.toString("utf-8") : undefined;
  }
  if (/application\/json/i.test(type)) {
    const buf = await toBuffer(input, max);
    return buf.length ? JSON.parse(buf.toString("utf-8")) : undefined;
  }
  if (/application\/x-www-form-urlencoded/i.test(type)) {
    const buf = await toBuffer(input, max);
    return buf.length ? parseUrlEncoded(buf.toString("utf-8")) : undefined;
  }

  // Case B: a single raw file as the whole body (image/*, video/*, octet-stream).
  // With no `dest` it becomes ctx.body as a Buffer (buffered → counted); with a
  // `dest` it's a file (pipeline-buffered or streamed) → governed by
  // upload().limit(), not the body limit, so uncounted.
  if (!dest) {
    const buf = await toBuffer(input, max);
    return buf.length ? buf : undefined;
  }
  if (dest instanceof UploadPipeline) {
    const buf = await toBuffer(input);
    return buf.length
      ? dest.processFile(`upload${extFromType(type)}`, buf, type)
      : undefined;
  }
  return streamToBucket(toStream(input), type, dest);
}
