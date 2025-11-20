import * as fs from "node:fs";
import * as path from "node:path";
import * as fsp from "node:fs/promises";
import type { Bucket } from "../types.js";

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
      if (!stats || !stats.isFile()) return null;

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
    write: (name: string, value?: any, type?: string): any => {
      const fullPath = absolute(name);
      if (value) {
        return fsp.writeFile(fullPath, value, type as any).then(() => fullPath);
      }
      return fs.createWriteStream(fullPath);
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
  } as Bucket;
}

function thinBunBucket(s3: any): Bucket {
  return {
    read: async (name: string) => {
      const file = s3.file(name);
      if (!(await file.exists())) return null;
      return await file.stream();
    },
    write: async (name: string, value?: any) => {
      const file = s3.file(name);
      if (value) {
        await file.write(value);
        return name;
      }
      return s3.presign(name, { expiresIn: 3600, acl: "public-read-write" });
    },
    delete: async (name: string) => {
      const file = s3.file(name);
      if (!(await file.exists())) return null;
      return await file.delete();
    },
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
  if ((root as any).file && (root as any).write) {
    return thinBunBucket(root);
  }

  // Assuming the base is already implementing our API
  return root as Bucket;
}
