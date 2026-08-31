import ServerError from "../errors";
import { parseBytes } from "../util/bytes";
import { isSniffable } from "./sniff";
import type { Settings } from "../types";
import Bucket_, { type Bucket } from "./bucket";

export type LimitOptions = {
  maxFileSize?: number | string;
  maxTotalSize?: number | string;
  maxFiles?: number;
  minSize?: number | string;
  fileType?: string[];
};

// The `uploads` option's object form: where to store files, plus optional
// per-file validation. A bare path/Bucket streams files through unvalidated.
export type UploadOptions = LimitOptions & {
  bucket: string | Bucket;
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
// the request path consumes: every form becomes `{ bucket, maxFileSize, minSize,
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
    const { bucket, maxFileSize, maxTotalSize, maxFiles, minSize, fileType } =
      up as UploadOptions;
    if (maxFileSize != null) parseBytes(maxFileSize);
    if (maxTotalSize != null) parseBytes(maxTotalSize);
    if (minSize != null) parseBytes(minSize);
    return {
      bucket: Bucket_(bucket)!,
      maxFileSize: maxFileSize ?? DEFAULT_FILE_SIZE,
      maxTotalSize: maxTotalSize ?? DEFAULT_TOTAL_SIZE,
      maxFiles: maxFiles ?? DEFAULT_FILES,
      minSize,
      fileType,
    };
  }
  return {
    bucket: Bucket_(up)!,
    maxFileSize: DEFAULT_FILE_SIZE,
    maxTotalSize: DEFAULT_TOTAL_SIZE,
    maxFiles: DEFAULT_FILES,
  };
}

// Returns the lowercase extension including the leading dot, e.g. ".jpg".
// Falls back to ".bin" for files with no extension or dotfiles.
export function getExt(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i <= 0) return ".bin";
  return filename.slice(i).toLowerCase();
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
  if (!fileType || fileType.length === 0) return;

  // Claiming a format we know how to recognise, while the bytes are not it,
  // is the case the whitelist exists to catch: a real one would have sniffed.
  if (sniffed === null && isSniffable(contentType)) {
    throw ServerError.UPLOAD_TYPE_NOT_ALLOWED({
      name: originalName,
      type: contentType,
      allowed: fileType,
    });
  }

  const ext = getExt(originalName);
  const mime = contentType.toLowerCase();
  const allowed = fileType.some(
    (t) => t.toLowerCase() === mime || t.toLowerCase() === ext,
  );
  if (!allowed) {
    throw ServerError.UPLOAD_TYPE_NOT_ALLOWED({
      name: originalName,
      type: contentType,
      allowed: fileType,
    });
  }
}

