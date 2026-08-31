import type { BucketFile } from "../types";
import { mimeOf } from "./mimes";

// The MIME type to serve a stored file as. A bucket file may expose `type`
// directly (like Blob/File.type); when it doesn't, fall back to its extension,
// so a file served from any bucket still gets a Content-Type.
export default function fileType(file: BucketFile): string | undefined {
  return file.type || mimeOf(file.path || file.name || "");
}
