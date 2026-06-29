import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import type { Bucket } from "..";

function thinLocalBucket(root: string): Bucket {
  const absolute = (name: string): string => {
    if (!name) throw new Error("File name is required");
    return path.resolve(path.join(root, name));
  };

  return {
    location: path.resolve(root),
    read: async (name: string): Promise<ReadableStream | null> => {
      const fullPath = absolute(name);
      const stats = await fsp.stat(fullPath).catch(() => null);
      if (!stats?.isFile()) return null;

      const nodeStream = fs.createReadStream(fullPath);
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
    },
    write: async (
      name: string,
      value?: any,
      type?: BufferEncoding,
    ): Promise<any> => {
      const fullPath = absolute(name);
      if (!value) return fs.createWriteStream(fullPath);
      // folder() may point at a nested path that doesn't exist yet
      await fsp.mkdir(path.dirname(fullPath), { recursive: true });
      // A web ReadableStream is written chunk by chunk, never fully buffered
      if (value instanceof ReadableStream) {
        const writable = fs.createWriteStream(fullPath);
        for await (const chunk of value as AsyncIterable<Uint8Array>) {
          writable.write(chunk);
        }
        await new Promise<void>((resolve, reject) => {
          writable.on("error", reject);
          writable.end(resolve);
        });
        return fullPath;
      }
      await fsp.writeFile(fullPath, value, type);
      return fullPath;
    },
    delete: async (name: string): Promise<boolean> => {
      const fullPath = absolute(name);
      try {
        await fsp.unlink(fullPath);
        return true;
      } catch {
        return false;
      }
    },
    folder: (prefix: string): Bucket => thinLocalBucket(path.join(root, prefix)),
  } as Bucket;
}

function thinBunBucket(s3: any, prefix = ""): Bucket {
  const key = (name: string) => (prefix ? `${prefix}/${name}` : name);
  return {
    read: async (name: string) => {
      const file = s3.file(key(name));
      if (!(await file.exists())) return null;
      return await file.stream();
    },
    write: async (name: string, value?: any) => {
      const file = s3.file(key(name));
      if (value) {
        await file.write(value);
        return key(name);
      }
      return s3.presign(key(name), {
        expiresIn: 3600,
        acl: "public-read-write",
      });
    },
    delete: async (name: string) => {
      const file = s3.file(key(name));
      if (!(await file.exists())) return null;
      return await file.delete();
    },
    folder: (sub: string) => thinBunBucket(s3, key(sub)),
  } as Bucket;
}

// A fake tiny implementation of a generic bucket, it needs
// at the very least a read(id) and write(id, value), both returning
// promises. If possible both are also pipeable/streamable.
export default function (root?: string | Bucket): Bucket | null {
  if (!root) return null;

  // Already a bucket, no need to do anything with it, just return it:
  if (typeof root === "string") {
    return thinLocalBucket(root);
  }

  // Bun's S3
  if ((root as Bucket & { file: string }).file && root.write) {
    return thinBunBucket(root);
  }

  // Assuming the base is already implementing our API
  return root as Bucket;
}
