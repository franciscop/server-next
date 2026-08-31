import { createReadStream } from "node:fs";
import fsp from "node:fs/promises";
import type { Context } from "../index";
import server from "../index";
import toWeb from "../util/toWeb";

describe("request body formats", () => {
  const UPLOADS = "./src/tests/uploads/_body";
  afterAll(() => fsp.rm(UPLOADS, { recursive: true, force: true }));

  const api = server({ uploads: UPLOADS })
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
    expect(body.file.path).toMatch(/^\w{16}\.jpg$/);
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

  it("refuses a file field rather than dropping it", async () => {
    const form = new FormData();
    form.append("name", "alice");
    const fileBuffer = await fsp.readFile("./src/tests/nero.jpg");
    const blob = new Blob([fileBuffer], { type: "image/jpeg" });
    form.append("avatar", blob, "nero.jpg");
    const res = await api.post("/", form);
    expect(res.status).toBe(500);
    // The reason is for the operator; the client just gets the status
    expect(await res.text()).toBe("Server Error");
  });

  it("refuses an all-files FormData too", async () => {
    const form = new FormData();
    const blob = new Blob(["data"], { type: "image/png" });
    form.append("img", blob, "img.png");
    const res = await api.post("/", form);
    expect(res.status).toBe(500);
  });
});

// A malformed multipart request is the client's mistake, so it gets a 400 it
// can read rather than a file in the bucket and a line in the server's log.
describe("a malformed multipart request", () => {
  const UPLOADS = "./src/tests/uploads/_multipart";
  afterAll(() => fsp.rm(UPLOADS, { recursive: true, force: true }));

  const send = (app: any) =>
    app.test().post("/", "SECRET-PAYLOAD", {
      headers: { "content-type": "multipart/form-data" },
    });

  it("is a 400, not a stored file", async () => {
    const res = await send(server({ uploads: UPLOADS }).post("/", (ctx) => ctx.body));
    expect(res.status).toBe(400);
    expect(await fsp.readdir(UPLOADS).catch(() => [])).toEqual([]);
  });

  it("is a 400 with no uploads configured, rather than a raw body", async () => {
    const res = await send(server().post("/", (ctx) => ctx.body));
    expect(res.status).toBe(400);
  });

  it("reaches onError like any other error", async () => {
    let seen: any;
    const app = server({
      onError: (error: any) => {
        seen = error;
        return new Response("handled", { status: 422 });
      },
    }).post("/", (ctx) => ctx.body);

    const res = await send(app);
    expect(res.status).toBe(422);
    expect(await res.text()).toBe("handled");
    expect(seen.code).toBe("BODY_INVALID_MULTIPART");
    expect(seen.status).toBe(400);
  });
});
