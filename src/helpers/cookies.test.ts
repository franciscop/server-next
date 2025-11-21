import server, { cookies } from "..";

describe("set-cookie", () => {
  const app = server()
    .get("/hello", () => {
      return cookies({ hello: "world" }).send();
    })
    .get("/multiple", () => {
      return cookies({ a: "b", c: "d" }).send();
    });

  it("sets the right cookie", async () => {
    const api = app.test();
    const res = await api.get("/hello");
    expect(res.headers["set-cookie"]).toBe("hello=world;Path=/");
  });

  it("can set multiple cookies", async () => {
    const api = app.test();
    const res = await api.get("/multiple");
    expect(res.headers["set-cookie"]).toEqual(["a=b;Path=/", "c=d;Path=/"]);
  });
});
