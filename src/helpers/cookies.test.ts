import server, { cookies } from "..";

describe("set-cookie", () => {
  const api = server()
    .get("/hello", () => {
      return cookies({ hello: "world" }).send();
    })
    .get("/multiple", () => {
      return cookies({ a: "b", c: "d" }).send();
    })
    .test();

  it("sets the right cookie", async () => {
    const res = await api.get("/hello");
    expect(res.headers.get("set-cookie")).toBe("hello=world;Path=/");
  });

  it("can set multiple cookies", async () => {
    const res = await api.get("/multiple");
    expect(res.headers.get("set-cookie")).toEqual("a=b;Path=/, c=d;Path=/");
  });
});
