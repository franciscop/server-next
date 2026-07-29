// Compile-time only: asserts that `bucket`'s and `polystore`'s real types still
// satisfy our own `Bucket`/`BucketFile`/`KVStore` (src/types.ts). Those are
// hand-written *subsets* of the real interfaces, kept minimal on purpose (see
// their comments), so this isn't a shape equality check, just assignability
// one way. It exists to catch the next upstream reshape at build time: this
// file already caught two real breaks this way (bucket 0.5 dropping
// `BucketFile.id`, and its `info()` losing its `exists` field).
//
// No test runner needed: `tsc --noEmit` (run by `npm test` / `npm run lint`)
// fails this file the same as any other type error, which is the whole point.
import type { Bucket as RealBucket, BucketFile as RealBucketFile } from "bucket";
import type { Store as RealStore } from "polystore";
import type { Bucket, BucketFile, KVStore } from "./types";

// A real bucket instance is usable wherever we ask for our own `Bucket`
declare const realBucket: RealBucket;
const _bucket: Bucket = realBucket;

// Same for a single file handle
declare const realBucketFile: RealBucketFile;
const _bucketFile: BucketFile = realBucketFile;

// A real polystore Store is usable wherever we ask for our own `KVStore`
declare const realStore: RealStore;
const _store: KVStore = realStore;

// Referenced so `noUnusedLocals`-style linters don't flag the assertions above
export type { _bucket as bucket, _bucketFile as bucketFile, _store as store };
