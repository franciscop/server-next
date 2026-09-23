import ServerError from "../errors";
import { parseBytes } from "../util/bytes";
import { isSniffable } from "./sniff";
import mimes from "../http/mimes";
import type { Context, Settings } from "../types";
import Bucket_, { type Bucket } from "./bucket";

// Decides whether a request may store files at all, before its body is read:
// return `false` to refuse it, or throw for an error of your own. Runs after
// `ctx.user` is resolved, so authentication is the common check.
export type UploadValidate = (ctx: Context) => unknown | Promise<unknown>;

export type LimitOptions = {
  maxFileSize?: number | string;
  maxTotalSize?: number | string;
  maxFiles?: number;
  minFileSize?: number | string;
  fileType?: string[];
};

// The `uploads` option's object form: where to store files, plus optional
// per-file validation. A bare path/Bucket streams files through unvalidated.
export type UploadOptions = LimitOptions & {
  bucket: string | Bucket;
  validate?: UploadValidate;
};

export type UploadedFile = {
  // The filename the client sent
  name: string;
  // Where it's stored: its key within the bucket, to read or serve it later
  path: string;
  type: string;
  size: number;
};

// Uploads are bounded by default: a request that stores files should not be
// able to store an unbounded number of bytes just because nobody set a limit.
const DEFAULT_FILE_SIZE = "10mb";
const DEFAULT_TOTAL_SIZE = "100mb";
const DEFAULT_FILES = 100;

// Normalize an `uploads` option (root or per-route) into the resolved shape
// the request path consumes: every form becomes `{ bucket, maxFileSize, minFileSize,
// fileType }` with the bucket built, or null when off. Idempotent, so a route
// merged twice (a `router()` into a server) resolves cleanly. Bad size
// strings ('5megs') fail here, at boot, not on the first upload.
export function resolveUploads(
  up: string | Bucket | UploadOptions | false | undefined,
): Settings["uploads"] {
  // `false` is "ignore files on purpose"; nothing at all is a missing config,
  // and the two must stay distinguishable all the way to the request
  if (up === false) return false;
  if (!up) return null;
  if (typeof up === "object" && "bucket" in up) {
    const {
      bucket,
      maxFileSize,
      maxTotalSize,
      maxFiles,
      minFileSize,
      fileType,
      validate,
    } = up as UploadOptions;
    if (maxFileSize != null) parseBytes(maxFileSize);
    if (maxTotalSize != null) parseBytes(maxTotalSize);
    if (minFileSize != null) parseBytes(minFileSize);
    return {
      bucket: Bucket_(bucket)!,
      maxFileSize: maxFileSize ?? DEFAULT_FILE_SIZE,
      maxTotalSize: maxTotalSize ?? DEFAULT_TOTAL_SIZE,
      maxFiles: maxFiles ?? DEFAULT_FILES,
      minFileSize,
      fileType,
      validate,
    };
  }
  return {
    bucket: Bucket_(up)!,
    maxFileSize: DEFAULT_FILE_SIZE,
    maxTotalSize: DEFAULT_TOTAL_SIZE,
    maxFiles: DEFAULT_FILES,
  };
}

// Checks what a file claims to be against the `fileType` whitelist. The type
// is the sniffed one where the bytes said something, and the client's claim
// otherwise, so this is a real check for formats with a signature.
export function validateFile(
  originalName: string,
  contentType: string,
  limits: LimitOptions,
  sniffed?: string | null,
): void {
  const { fileType } = limits;

  // Claiming a format we can recognise while the bytes are not it is a
  // provable lie, so it is refused whether or not a whitelist is configured.
  if (sniffed === null && isSniffable(contentType)) {
    throw ServerError.UPLOAD_TYPE_NOT_ALLOWED({
      name: originalName,
      type: contentType,
      allowed: fileType ?? [contentType],
    });
  }

  if (!fileType || fileType.length === 0) return;

  // Checked against the one type we determined, never against the client's
  // filename: the value that passes here is the value the file is stored as.
  // A "/" marks a MIME type ("text/csv"); anything else is an extension,
  // with or without the dot ("csv", ".csv").
  // Compared without parameters, since our table carries charsets
  const base = (value: string) => value.split(";")[0].trim().toLowerCase();
  const type = base(contentType);
  const allowed = fileType.some((one) => {
    const entry = one.trim().toLowerCase();
    // "image/*" matches every type in that family
    if (entry.endsWith("/*")) return type.startsWith(entry.slice(0, -1));
    if (entry.includes("/")) return base(entry) === type;
    const mapped = mimes[entry.replace(/^\./, "")];
    return Boolean(mapped) && base(mapped) === type;
  });
  if (!allowed) {
    throw ServerError.UPLOAD_TYPE_NOT_ALLOWED({
      name: originalName,
      type: contentType,
      allowed: fileType,
    });
  }
}
