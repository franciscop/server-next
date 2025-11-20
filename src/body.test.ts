import "./tests/toSucceed.js";

import server from "./index.js";
import type { Context } from "./types.js";
import { createReadStream } from "node:fs";
import fsp from "node:fs/promises";
import toWeb from "./helpers/toWeb.js";

describe("request body formats", () => {
  const api = server({ uploads: "./src/tests/uploads" })
    .post("/", (ctx: Context) => {
      return ctx.body;
    })
    .test();

  it("accepts plain text", async () => {
    const { body } = await api.post("/", "Hello world");
    expect(body).toBe("Hello world");
  });

  it("accepts a plain JSON", async () => {
    const reqBody = JSON.stringify({ hello: "world" });
    const headers = { "content-type": "application/json" };
    const { body } = await api.post("/", reqBody, { headers });
    expect(body.hello).toBe("world");
  });

  it("accepts a FormData", async () => {
    const reqBody = new FormData();
    reqBody.append("hello", "world");
    const { body } = await api.post("/", reqBody);
    expect(body.hello).toBe("world");
  });

  it("accepts a FormData with a file", async () => {
    const reqBody = new FormData();
    reqBody.append("hello", "world");
    const fileBuffer = await fsp.readFile("./src/tests/nero.jpg");
    const blob = new Blob([fileBuffer], { type: "image/jpeg" });
    reqBody.append("file", blob, "nero.jpg");
    const { body } = await api.post("/", reqBody);
    expect(body.hello).toBe("world");
    expect(body.file.split(".").pop()).toBe("jpg");
  });

  it("accepts a ReadableStream from text", async () => {
    const reqBody = toWeb(createReadStream("./readme.md"));
    const { body } = await api.post("/", reqBody);
    expect(body).toContain("# Server");
  });

  it("accepts a ReadableStream from binary", async () => {
    const reqBody = toWeb(createReadStream("./tests/nero.jpg"));
    await api.post("/", reqBody);
  });
});
