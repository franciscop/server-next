import { FileSystem } from "bucket";
// bucket's own IBucket type (aliased to avoid clashing with our `Bucket`).
import type { Bucket as IBucket } from "bucket";
import { rm } from "node:fs/promises";
import createId from "../helpers/createId";

// Real `bucket` FileSystem instances in throwaway temp dirs, so tests exercise
// the actual canonical interface instead of a hand-rolled mock. Call
// cleanupBuckets() in an afterAll to remove everything written.
const ROOT = new URL("./uploads/_real/", import.meta.url).pathname;

export function realBucket(): IBucket {
  return FileSystem(`${ROOT}${createId()}`);
}

export function cleanupBuckets(): Promise<void> {
  return rm(ROOT, { recursive: true, force: true });
}

// list() throws ENOENT when nothing has been written to the bucket yet (its
// directory doesn't exist), so treat that as an empty bucket.
export function count(bucket: IBucket): Promise<number> {
  return bucket
    .list()
    .then((files) => files.length)
    .catch(() => 0);
}
