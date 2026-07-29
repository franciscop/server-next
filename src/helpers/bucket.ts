import FileSystem from "bucket/fs";
import type { Bucket } from "..";

// Normalize the `public` / `uploads` / `favicon` option into a canonical Bucket:
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
