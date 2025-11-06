import bucket from "./bucket.js";
import fsp from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";

const localBucket = bucket("./tests/uploads/");

describe("bucket", () => {
  afterAll(async () => {
    const filePath = path.resolve("./tests/uploads/testFile.txt");
    if (fs.existsSync(filePath)) {
      await fsp.unlink(filePath);
    }
  });

  it("writes a file", async () => {
    const filePath = await localBucket!.write("testFile.txt", "Hello, World!");
    expect(
      typeof filePath === "string" && filePath.endsWith("testFile.txt"),
    ).toBe(true);
  });

  it("reads a file", async () => {
    const stream = await localBucket!.read("testFile.txt");
    expect(stream).not.toBeNull();
    let data = "";
    const reader = stream!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      data += new TextDecoder().decode(value);
    }
    expect(data).toBe("Hello, World!");
  });

  it("deletes a file", async () => {
    const filePath = path.resolve("./tests/uploads/testFile.txt");
    await fsp.unlink(filePath);
    const stream = await localBucket!.read("testFile.txt");
    expect(stream).toBeNull();
  });

  it("removes an existing file", async () => {
    await localBucket!.write("testFile.txt", "To be deleted");
    const isDeleted = await localBucket!.delete("testFile.txt");
    expect(isDeleted).toBe(true);
  });

  it("tries to remove a non-existing file", async () => {
    const isDeleted = await localBucket!.delete("nonExistentFile.txt");
    expect(isDeleted).toBe(false);
  });
});
