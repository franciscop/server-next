import { createReadStream } from "node:fs";
import fsp from "node:fs/promises";
import type { Context } from ".";
import server from ".";
import { toWeb } from "./helpers";

describe("request body formats", () => {
  const api = server({ uploads: "./src/tests/uploads" })
    .post("/", (ctx: Context) => ctx.body)
    .test();

  it("accepts plain text", async () => {
    const res = await api.post("/", "Hello world");
    expect(await res.text()).toBe("Hello world");
  });

  it("accepts a plain JSON", async () => {
    const reqBody = JSON.stringify({ hello: "world" });
    const headers = { "content-type": "application/json" };
    const res = await api.post("/", reqBody, { headers });
    const body = await res.json();
    expect(await body.hello).toBe("world");
  });

  it("accepts a FormData", async () => {
    const reqBody = new FormData();
    reqBody.append("hello", "world");
    const res = await api.post("/", reqBody);
    const body = await res.json();
    expect(body.hello).toBe("world");
  });

  it("accepts a FormData with a file", async () => {
    const reqBody = new FormData();
    reqBody.append("hello", "world");
    const fileBuffer = await fsp.readFile("./src/tests/nero.jpg");
    const blob = new Blob([fileBuffer], { type: "image/jpeg" });
    reqBody.append("file", blob, "nero.jpg");
    const res = await api.post("/", reqBody);
    const body = await res.json();
    expect(body.hello).toBe("world");
    // Rich file object
    expect(body.file.name).toBe("nero.jpg");
    expect(body.file.id).toMatch(/^\w{16}\.\w+$/);
    expect(body.file.path).toMatch(/uploads.*\.jpg$/);
    expect(body.file.type).toBe("image/jpeg");
    expect(body.file.size).toBeGreaterThan(0);
  });

  it("accepts a ReadableStream from text", async () => {
    const reqBody = toWeb(createReadStream("./readme.md"));
    const res = await api.post("/", reqBody);
    const body = await res.text();
    expect(body).toContain("# Server");
  });

  it("accepts a ReadableStream from binary", async () => {
    const reqBody = toWeb(createReadStream("./src/tests/nero.jpg"));
    await api.post("/", reqBody);
  });
});

describe("uploads: not configured", () => {
  const api = server()
    .post("/", (ctx: Context) => ctx.body)
    .test();

  it("still parses text fields from FormData", async () => {
    const form = new FormData();
    form.append("name", "alice");
    form.append("message", "hello");
    const res = await api.post("/", form);
    const body = await res.json();
    expect(body.name).toBe("alice");
    expect(body.message).toBe("hello");
  });

  it("silently skips file fields", async () => {
    const form = new FormData();
    form.append("name", "alice");
    const fileBuffer = await fsp.readFile("./src/tests/nero.jpg");
    const blob = new Blob([fileBuffer], { type: "image/jpeg" });
    form.append("avatar", blob, "nero.jpg");
    const res = await api.post("/", form);
    const body = await res.json();
    expect(body.name).toBe("alice");
    expect(body.avatar).toBeUndefined();
  });

  it("returns nothing for an all-files FormData", async () => {
    const form = new FormData();
    const blob = new Blob(["data"], { type: "image/png" });
    form.append("img", blob, "img.png");
    const res = await api.post("/", form);
    const body = await res.json();
    expect(body.img).toBeUndefined();
  });
});
