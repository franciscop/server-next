import "./test/toSucceed.js";

import server, { status } from "./index.js";

describe("exports", () => {
  it("exports as a function", () => {
    expect(typeof server()).toBe("function");
  });

  it("nested is also a function", () => {
    expect(typeof server().get("/", () => {})).toBe("function");
  });

  it("export has a fetch", () => {
    expect(typeof server().fetch).toBe("function");
    expect(typeof server().get().fetch).toBe("function");
  });

  it("export has the basic methods", () => {
    expect(typeof server().get).toBe("function");
    expect(typeof server().post).toBe("function");
    expect(typeof server().use).toBe("function");
    expect(typeof server().router).toBe("function");
  });

  it("export has the basic nested methods", () => {
    expect(typeof server().get().get).toBe("function");
    expect(typeof server().post().post).toBe("function");
    expect(typeof server().use().use).toBe("function");
    expect(typeof server().get().router).toBe("function");
  });

  it("nested is also a function", () => {
    expect(typeof server().get("/", () => {}).fetch).toBe("function");
  });
});

describe("return different types", () => {
  const api = server()
    .get("/", () => "Hello world")
    .get("/text", () => "Hello world")
    .get("/array", () => ["Hello world"])
    .get("/object", () => ({ hello: "world" }))
    .get("/status", () => 201)
    .test();

  it("can get the plain text", async () => {
    const { data } = await api.get("/text");
    expect(data).toBe("Hello world");
  });

  it("can get the array", async () => {
    const { data } = await api.get("/array");
    expect(data).toEqual(["Hello world"]);
  });

  it("can get the object", async () => {
    const req = await api.get("/object");
    expect(req).toSucceed({ hello: "world" });
  });

  it("can get the status", async () => {
    const req = await api.get("/status");
    expect(req).toSucceed();
    expect(req.status).toBe(201);
  });
});

describe("simple post works", () => {
  const api = server()
    .post("/", (ctx) => status(201).send(ctx.body))
    .test();

  // Bun's bug: https://github.com/oven-sh/bun/issues/6348
  it.skip("can post new data", async () => {
    const { data, status, headers } = await api.post("/", "New Data");
    expect(status).toBe(201);
    expect(data).toBe("New Data");
    expect(headers["content-type"]).toBe("text/plain; charset=utf-8");
  });

  // Bun's bug: https://github.com/oven-sh/bun/issues/6348
  it.skip("will return JSON", async () => {
    const { data, status, headers } = await api.post("/", { hello: "world" });
    expect(status).toBe(201);
    expect(data).toEqual({ hello: "world" });
    expect(headers["content-type"]).toBe("application/json; charset=utf-8");
  });
});
