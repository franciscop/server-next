import fs from "node:fs";
import path from "node:path";
import fsp from "node:fs/promises";

function thinLocalBucket(root) {
  const absolute = (name) => {
    if (!name) throw new Error("File name is required");
    return path.resolve(path.join(root, name));
  };

  return {
    read: async (name) => {
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
    write: (name, value, type) => {
      const fullPath = absolute(name);
      if (value) {
        return fsp.writeFile(fullPath, value, type).then(() => fullPath);
      }
      return fs.createWriteStream(fullPath);
    },
    delete: (name) => {
      const fullPath = absolute(name);
      return fsp.unlink(fullPath);
    },
  };
}

function thinBunBucket(s3) {
  return {
    read: async (name) => {
      const file = s3.file(name);
      if (!(await file.exists())) return null;
      return await file.stream();
    },
    write: async (name, value) => {
      const file = s3.file(name);
      if (value) {
        await file.write(value);
        return name;
      }
      return s3.presign(name, { expiresIn: 3600, acl: "public-read-write" });
    },
    delete: async (name) => {
      const file = s3.file(name);
      if (!(await file.exists())) return null;
      return await file.delete();
    },
  };
}

// A fake tiny implementation of a generic bucket, it needs
// at the very least a read(id) and write(id, value), both returning
// promises. If possible both are also pipeable/streamable.
export default function (root) {
  if (!root) return null;

  // Already a bucket, no need to do anything with it, just return it:
  if (typeof root === "string") {
    return thinLocalBucket(root);
  }

  // Bun's S3
  if (root.file && root.write) {
    return thinBunBucket(root);
  }

  // Assuming the base is already implementing our API
  return root;
}
