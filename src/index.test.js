import server, { status } from "./index.js";

describe("return different types", () => {
  const app = server()
    .get("/", () => "Hello world")
    .get("/text", () => "Hello world")
    .get("/array", () => ["Hello world"])
    .get("/object", () => ({ hello: "world" }))
    .get("/status", () => 201);

  it("can get the plain text", async () => {
    const res = await app.fetch(new Request("http://localhost:3000/text"));
    expect(await res.text()).toBe("Hello world");
  });

  it("can get the array", async () => {
    const res = await app.fetch(new Request("http://localhost:3000/array"));
    expect(await res.json()).toEqual(["Hello world"]);
  });

  it("can get the object", async () => {
    const res = await app.fetch(new Request("http://localhost:3000/object"));
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("can get the status", async () => {
    const res = await app.fetch(new Request("http://localhost:3000/status"));
    expect(res.status).toBe(201);
  });
});

describe("simple post works", () => {
  const app = server().post("/", (ctx) => status(201).send(ctx.body));

  it("can post new data", async () => {
    const res = await app.fetch(
      new Request("http://localhost:3000/", {
        method: "POST",
        body: "New Data",
      })
    );

    expect(res.status).toBe(201);
    expect(await res.text()).toBe("New Data");
  });

  it("will return JSON", async () => {
    const res = await app.fetch(
      new Request("http://localhost:3000/", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ hello: "world" });
  });
});
