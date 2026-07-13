import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import type { Bucket, BucketFile } from "..";
import mimes from "./mimes";

// A built-in local-filesystem bucket implementing the canonical `bucket`
// interface (file/folder), so `@server/next` works with just a directory path,
// no `bucket` install required. A real `bucket` instance is used as-is.
function localBucket(root: string): Bucket {
  const base = path.resolve(root);

  // Resolve a key under `root`, stripping any leading slash and refusing to
  // escape the root (e.g. via `../`), so a request path can't traverse out.
  const resolveKey = (name: string): string => {
    if (!name) throw new Error("File name is required");
    const full = path.resolve(base, name.replace(/^\/+/, ""));
    if (full !== base && !full.startsWith(base + path.sep)) {
      throw new Error(`Path "${name}" escapes the bucket root`);
    }
    return full;
  };

  // `win` is an optional byte window [start, end) (end exclusive; end may be
  // Infinity for an open-ended slice), applied to reads so slice() views work.
  const file = (
    name: string,
    win?: { start: number; end: number },
  ): BucketFile => {
    const full = resolveKey(name);

    // The MIME type derived from the file's extension (undefined if unknown), so
    // consumers like reply.file() get it straight off the handle.
    const type = mimes[path.extname(name).slice(1).toLowerCase()];

    // Read the file, or the current window, as a web ReadableStream. fs ranges
    // are inclusive on both ends, so a window [start, end) reads up to end - 1.
    const read = (): ReadableStream => {
      let opts: { start?: number; end?: number } | undefined;
      if (win) {
        opts = { start: win.start };
        if (Number.isFinite(win.end)) opts.end = Math.max(win.start, win.end - 1);
      }
      const nodeStream = fs.createReadStream(full, opts);
      return new ReadableStream({
        start(controller) {
          nodeStream.on("data", (chunk) => controller.enqueue(chunk));
          nodeStream.on("end", () => controller.close());
          nodeStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });
    };

    return {
      path: full,
      id: name.replace(/^\/+/, ""),
      name: path.basename(name),
      type,

      async exists(): Promise<boolean> {
        const stats = await fsp.stat(full).catch(() => null);
        return !!stats?.isFile();
      },

      async info() {
        const stats = await fsp.stat(full).catch(() => null);
        const exists = !!stats?.isFile();
        const total = stats?.size ?? 0;
        // A window reports its clamped length, like the real bucket's slice.
        const size = win
          ? Math.max(0, Math.min(win.end, total) - win.start)
          : total;
        return { exists, size, date: stats?.mtime ?? null, type };
      },

      // Read-only view of [start, end), composed relative to the current window.
      slice(start: number, end?: number): BucketFile {
        const base = win?.start ?? 0;
        const cap = win?.end ?? Number.POSITIVE_INFINITY;
        const s = Math.min(cap, base + Math.max(0, start));
        const e = end === undefined ? cap : Math.min(cap, base + end);
        return file(name, { start: s, end: e });
      },

      async write(content): Promise<void> {
        // folder() may point at a nested path that doesn't exist yet
        await fsp.mkdir(path.dirname(full), { recursive: true });
        // A web ReadableStream is written chunk by chunk, never fully buffered
        if (content instanceof ReadableStream) {
          const writable = fs.createWriteStream(full);
          for await (const chunk of content as AsyncIterable<Uint8Array>) {
            writable.write(chunk);
          }
          await new Promise<void>((resolve, reject) => {
            writable.on("error", reject);
            writable.end(() => resolve());
          });
          return;
        }
        await fsp.writeFile(full, content as string | Buffer);
      },

      stream(): ReadableStream {
        return read();
      },

      async bytes(): Promise<Uint8Array> {
        if (win) return new Uint8Array(await new Response(read()).arrayBuffer());
        return new Uint8Array(await fsp.readFile(full));
      },

      async remove(): Promise<void> {
        await fsp.unlink(full).catch(() => {});
      },
    };
  };

  return {
    file,
    folder: (prefix: string): Bucket => localBucket(path.join(base, prefix)),
  };
}

// Normalize the `public` / `uploads` / `favicon` option into a canonical Bucket:
// a string path becomes the built-in local bucket, and any object exposing
// `file()` (a `bucket` instance) is used as-is.
export default function bucket(root?: string | Bucket): Bucket | null {
  if (!root) return null;
  if (typeof root === "string") return localBucket(root);
  if (typeof (root as Bucket).file === "function") return root as Bucket;
  throw new Error(
    "Invalid bucket: pass a directory path or a `bucket` instance (with .file())",
  );
}
