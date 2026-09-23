import ServerError from "../errors";
import type { Bucket, BucketFile } from "..";
import createId from "../util/createId";
import mimes from "../http/mimes";
import sniff, { HEAD_SIZE, resolveType } from "./sniff";
import { parseBytes } from "../util/bytes";
import { type LimitOptions, validateFile } from "./upload";

// Only for buckets that cannot name a file themselves; the last extension for
// a type wins, so "image/jpeg" is ".jpg" rather than ".jpeg"
const extByMime: Record<string, string> = {};
for (const ext in mimes) extByMime[mimes[ext].split(";")[0].trim()] = ext;

// A random key with the extension the type implies, matching what create()
// would have named it
function keyFor(type: string): string {
  const ext = extByMime[type.split(";")[0].trim()];
  return `${createId()}${ext ? `.${ext}` : ""}`;
}

// Best effort: a file we cannot delete is not worth failing the request over.
// Most buckets remove(), some adapters (Bun's S3) call it delete().
async function discard(file: BucketFile): Promise<void> {
  try {
    const drop = file.remove ?? (file as any).delete;
    await drop?.call(file);
  } catch {
    // it was never written, or the bucket refused
  }
}

// The per-request file budget, shared by every part so `maxTotalSize` counts
// across all of them rather than per file.
export type Budget = { used: number; max: number; files: number };

export const asIterable = (s: ReadableStream) => s as AsyncIterable<Uint8Array>;

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
// What the sniff decided, and the open write it produced
type Opened = {
  type: string;
  controller: ReadableStreamDefaultController;
  // Resolves to the stored file once every byte is in
  write: Promise<BucketFile>;
  // Only set when we named the file ourselves, since then a failed write
  // leaves the partial bytes behind for us to clean up
  handle?: BucketFile;
};

export type Part =
  | { kind: "skip" }
  | { kind: "text"; name: string; chunks: Buffer[] }
  | { kind: "drop" }
  | {
      kind: "file";
      name: string;
      filename: string;
      // What the client called it; only used when the bytes say nothing
      declared: string;
      bucket: Bucket;
      limits: LimitOptions;
      budget: Budget;
      // Aborts the write when the client hangs up mid-upload
      signal?: AbortSignal;
      // Held until there is enough to sniff, then flushed into the write
      head: Buffer[];
      headSize: number;
      opened: Opened | null;
      size: number;
    };

// A fresh file part; nothing is opened yet, since the first bytes decide the
// stored name and the type. The raw-body path builds one directly too.
export function makeFilePart(
  name: string,
  filename: string,
  declared: string,
  bucket: Bucket,
  limits: LimitOptions,
  budget: Budget,
  signal?: AbortSignal,
): Part & { kind: "file" } {
  return {
    kind: "file",
    name,
    filename,
    declared,
    bucket,
    limits,
    budget,
    signal,
    head: [],
    headSize: 0,
    opened: null,
    size: 0,
  };
}

export function startPart(
  headerStr: string,
  bucket: Bucket | null | undefined | false,
  limits: LimitOptions,
  budget: Budget,
  signal?: AbortSignal,
): Part {
  const name = getMatching(headerStr, /name="(.+?)"/)
    .trim()
    .replace(/\[\]$/, "");
  if (!name) return { kind: "skip" };

  const filename = getMatching(headerStr, /filename="(.+?)"/).trim();
  if (!filename) return { kind: "text", name, chunks: [] };

  const type =
    getMatching(headerStr, /Content-Type:\s*([^\r\n]+)/i).trim() ||
    "application/octet-stream";

  // `false` is an explicit "drop files"; nothing configured is a mistake, and
  // silently discarding what someone uploaded is worse than saying so.
  if (bucket === false) return { kind: "drop" };
  if (!bucket) throw ServerError.UPLOAD_NOT_CONFIGURED({ name: filename });

  budget.files++;
  const { maxFiles } = limits;
  if (maxFiles != null && budget.files > maxFiles) {
    throw ServerError.UPLOAD_TOO_MANY_FILES({ limit: String(maxFiles) });
  }

  return makeFilePart(name, filename, type, bucket, limits, budget, signal);
}

// Stop a half-written file and take the partial bytes back out of the bucket
async function abortFile(
  part: Part & { kind: "file" },
  error: Error,
): Promise<never> {
  if (part.opened) {
    try {
      part.opened.controller.error(error);
      // The write rejects and the bucket discards whatever it had taken
      await part.opened.write.catch(() => {});
    } catch {
      // the stream was already closed
    }
    // A bucket we named the file for keeps the partial bytes instead
    if (part.opened.handle) await discard(part.opened.handle);
  }
  throw error;
}

// Both budgets, checked on every chunk so nothing oversized is ever completed
async function checkSize(
  part: Part & { kind: "file" },
  added: number,
): Promise<void> {
  part.budget.used += added;
  const { maxFileSize, maxTotalSize } = part.limits;
  if (maxFileSize != null && part.size > parseBytes(maxFileSize)) {
    await abortFile(
      part,
      ServerError.UPLOAD_TOO_LARGE({
        name: part.filename,
        size: String(part.size),
        limit: String(maxFileSize),
      }),
    );
  }
  if (maxTotalSize != null && part.budget.used > parseBytes(maxTotalSize)) {
    await abortFile(
      part,
      ServerError.UPLOAD_TOO_LARGE({
        name: part.filename,
        size: String(part.budget.used),
        limit: `${maxTotalSize} for the whole request`,
      }),
    );
  }
}

// The bytes decide what this is: the name gets a real extension only when we
// recognise the format, and `fileType` is checked against the truth when we
// have it and the client's claim when we do not.
function openFile(part: Part & { kind: "file" }): void {
  const head = Buffer.concat(part.head);
  const sniffed = sniff(head);
  const type = resolveType(sniffed, part.declared);

  validateFile(part.filename, type, part.limits, sniffed);

  let controller!: ReadableStreamDefaultController;
  const readable = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  const write = { type, signal: part.signal };
  // The bucket names it: a random id, plus the extension `type` implies. An
  // older bucket, or an adapter of your own, may not have create(): then we
  // pick the same kind of name and write to that handle instead.
  if (part.bucket.create) {
    part.opened = {
      type,
      controller,
      write: part.bucket.create(readable, write),
    };
    return;
  }
  const handle = part.bucket.file(keyFor(type));
  part.opened = {
    type,
    controller,
    handle,
    write: handle.write(readable, write).then(() => handle),
  };
}

export async function feedPart(part: Part, data: Buffer): Promise<void> {
  if (data.length === 0) return;
  if (part.kind === "text") {
    part.chunks.push(data);
    return;
  }
  if (part.kind !== "file") return;

  // Hold the first bytes back until there are enough of them to sniff
  if (!part.opened) {
    part.head.push(data);
    part.headSize += data.length;
    if (part.headSize < HEAD_SIZE) return;
    openFile(part);
    const head = Buffer.concat(part.head);
    part.opened!.controller.enqueue(head);
    part.size += head.length;
    await checkSize(part, head.length);
    return;
  }

  part.opened.controller.enqueue(data);
  part.size += data.length;
  await checkSize(part, data.length);
}

export async function endPart(
  part: Part,
  body: Record<string, any>,
): Promise<void> {
  if (part.kind === "text") {
    const buf = Buffer.concat(part.chunks);
    const value = isProbablyText(buf) ? buf.toString("utf-8").trim() : buf;
    addField(body, part.name, value);
    return;
  }
  if (part.kind !== "file") return;

  // A file smaller than the head buffer never triggered the flush above
  if (!part.opened) {
    openFile(part);
    const head = Buffer.concat(part.head);
    if (head.length) {
      part.opened!.controller.enqueue(head);
      part.size += head.length;
      await checkSize(part, head.length);
    }
  }
  const opened = part.opened!;
  opened.controller.close();
  const file = await opened.write;

  // Only knowable once it is all in, so an undersized file is written first
  const { minSize } = part.limits;
  if (minSize != null && part.size < parseBytes(minSize)) {
    await discard(file);
    throw ServerError.UPLOAD_TOO_SMALL({
      name: part.filename,
      size: String(part.size),
      limit: String(minSize),
    });
  }

  addField(body, part.name, {
    name: part.filename,
    path: file.path,
    type: opened.type,
    size: part.size,
  });
}
