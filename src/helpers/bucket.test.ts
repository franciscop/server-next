import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import bucket from "./bucket";

const bucketPath = new URL("../tests/uploads/", import.meta.url).pathname;
const localBucket = bucket(bucketPath)!;

describe("bucket", () => {
  afterAll(async () => {
    const filePath = path.join(bucketPath, "testFile.txt");
    if (fs.existsSync(filePath)) await fsp.unlink(filePath);
    await fsp.rm(path.join(bucketPath, "sub"), {
      recursive: true,
      force: true,
    });
  });

  it("writes a file and exposes its path", async () => {
    const file = localBucket.file("testFile.txt");
    await file.write("Hello, World!");
    expect(file.path.endsWith("testFile.txt")).toBe(true);
    expect(await file.exists()).toBe(true);
  });

  it("streams a file back", async () => {
    const stream = localBucket.file("testFile.txt").stream();
    expect(await new Response(stream).text()).toBe("Hello, World!");
  });

  it("reads the raw bytes", async () => {
    const bytes = await localBucket.file("testFile.txt").bytes();
    expect(Buffer.from(bytes).toString()).toBe("Hello, World!");
  });

  it("reports a missing file", async () => {
    expect(await localBucket.file("nonExistent.txt").exists()).toBe(false);
  });

  it("removes a file", async () => {
    const file = localBucket.file("testFile.txt");
    await file.write("To be deleted");
    expect(await file.exists()).toBe(true);
    await file.remove();
    expect(await file.exists()).toBe(false);
  });

  it("remove() on a missing file does not throw", async () => {
    await localBucket.file("nope.txt").remove();
  });

  it("scopes writes under folder()", async () => {
    const file = localBucket.folder("sub").file("nested.txt");
    await file.write("nested");
    expect(file.path).toMatch(/uploads\/sub\/nested\.txt$/);
    expect(await file.exists()).toBe(true);
  });

  it("refuses a path that escapes the root", () => {
    expect(() => localBucket.file("../secret")).toThrow();
  });
});
