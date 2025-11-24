import server, { status } from ".";

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
  });

  it("export has the basic nested methods", () => {
    expect(typeof server().get().get).toBe("function");
    expect(typeof server().post().post).toBe("function");
    expect(typeof server().use().use).toBe("function");
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
    const res = await api.get("/text");
    expect(await res.text()).toBe("Hello world");
  });

  it("can get the array", async () => {
    const res = await api.get("/array");
    expect(await res.json()).toEqual(["Hello world"]);
  });

  it("can get the object", async () => {
    const res = await api.get("/object");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("can get the status", async () => {
    const res = await api.get("/status");
    expect(res.status).toBe(201);
  });
});

describe("simple post works", () => {
  const api = server()
    .post("/", (ctx) => status(201).send(ctx.body))
    .test();

  it("can post new data", async () => {
    const res = await api.post("/", "New Data");
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toBe("text/plain");
    expect(await res.text()).toBe("New Data");
  });

  it("will return JSON", async () => {
    const res = await api.post("/", { hello: "world" });
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(await res.json()).toEqual({ hello: "world" });
  });
});
