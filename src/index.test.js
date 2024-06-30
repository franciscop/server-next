import server, { status } from "./index.js";

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

  it("can post new data", async () => {
    const { data, status } = await api.post("/", "New Data");
    expect(status).toBe(201);
    expect(data).toBe("New Data");
  });

  it("will return JSON", async () => {
    const { data, status, headers } = await api.post("/", { hello: "world" });
    expect(status).toBe(201);
    expect(data).toEqual({ hello: "world" });
    expect(headers["content-type"]).toBe("application/json");
  });
});
