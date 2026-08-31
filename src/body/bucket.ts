import FileSystem from "bucket/fs";

// Subset of the `bucket` library's FileInfo: file metadata used to build cheap
// cache validators (ETag / Last-Modified) without reading the bytes. `info()`
// resolves to null when the file doesn't exist, so these are always real.
export type FileInfo = {
  size: number;
  type: string | null;
  modified: Date;
};

// Mirrors the `bucket` library's BucketFile: a handle to a single object.
export type BucketFile = {
  // The file's key within the bucket, like "avatars/me.jpg". Not a filesystem
  // path, so it reads the same whether the bucket is local or in the cloud.
  readonly path: string;
  // Just the filename, with no folder
  readonly name: string;
  // The file's MIME type, when the bucket knows it (like Blob/File.type).
  readonly type?: string;
  exists(): Promise<boolean>;
  // Optional: metadata in one call, or null when the file doesn't exist.
  // `bucket` files provide it; used for conditional-request caching of assets.
  info?(): Promise<FileInfo | null>;
  write(
    content: string | Buffer | ReadableStream,
    options?: { type?: string },
  ): Promise<void>;
  stream(): ReadableStream;
  // Optional: a read-only view of the byte range `[start, end)` (end exclusive
  // and optional, like Blob.slice), whose stream()/bytes() read just that range.
  // Used to answer HTTP Range requests for static assets.
  slice?(start: number, end?: number): BucketFile;
  bytes(): Promise<Uint8Array>;
  remove(): Promise<void>;
};

// Mirrors the `bucket` library's IBucket. The framework only ever needs
// `file(name)`; `folder(prefix)` is an optional convenience for user handlers
// that want to scope storage (e.g. per-request folders), so it's not required
// of a backend the framework is handed.
export type Bucket = {
  file(name: string): BucketFile;
  folder?(prefix: string): Bucket;
};

// Recognized by shape, not class, so any bucket implementation matches. Kept
// next to the type so the guard and BucketFile cannot silently diverge.
export const isBucketFile = (value: any): value is BucketFile =>
  Boolean(value) &&
  typeof value.stream === "function" &&
  typeof value.bytes === "function" &&
  typeof value.exists === "function" &&
  typeof value.name === "string";

// Normalize the `public` / `uploads` option into a canonical Bucket:
// a string path becomes a local-filesystem bucket, and any object exposing
// `file()` (a `bucket` instance, or your own adapter) is used as-is.
//
// `bucket/fs` is the one provider imported here, so the S3/GCS/Azure/R2/B2
// clients are never loaded for an app that only stores files locally.
export default function bucket(root?: string | Bucket): Bucket | null {
  if (!root) return null;
  if (typeof root === "string") return FileSystem(root) as Bucket;
  if (typeof (root as Bucket).file === "function") return root as Bucket;
  throw new Error(
    "Invalid bucket: pass a directory path or a `bucket` instance (with .file())",
  );
}
