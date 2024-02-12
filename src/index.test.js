import server, { status } from "./index.js";

describe("server", () => {
  const app = server()
    .get("/", () => "Hello world")
    .get("/text", () => "Hello world")
    .get("/array", () => ["Hello world"])
    .get("/object", () => ({ hello: "world" }))
    .get("/status", () => 201)
    .post("/", (ctx) => status(201).send(ctx.body));

  it("can render hello world", async () => {
    const res = await app.fetch(new Request("http://localhost:3000/"));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello world");
  });

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

describe("all the replies", () => {});
