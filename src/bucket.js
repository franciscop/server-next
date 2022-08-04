import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";

// A fake tiny implementation of a generic bucket, it needs
// at the very least a read(id) and write(id, value), both returning
// promises. If possible both are also pipeable/streamable.
export default function (root) {
  const absolute = (name) => {
    if (!name) throw new Error(`File name is required`);
    return path.resolve(path.join(root, name));
  };

  return {
    read: (name, type = "utf8") => {
      const fullPath = absolute(name);
      return fsp.readFile(fullPath, type);
    },
    write: (name, value, type = "utf8") => {
      const fullPath = absolute(name);
      if (value) {
        return fsp.writeFile(fullPath, value, type).then(() => fullPath);
      } else {
        return fs.createWriteStream(fullPath);
      }
    },
  };
}
