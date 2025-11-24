import server from ".";
import * as reply from "./reply";

describe("Reply", () => {
  describe(".send()", () => {
    it("returns a Response", () => {
      const res = reply.send();
      expect(res instanceof Response).toBe(true);
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
      expect(res.headers.get("content-type")).toBe("text/plain");
    });
  });

  describe(".cookies()", () => {
    it("work as expected", async () => {
      const api = server()
        .get("/", () => reply.cookies({ hello: "world" }).send("Hello"))
        .test();
      const res = (await api.get("/")) as Response;
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("set-cookie")).toBe("hello=world;Path=/");
    });

    it("uses the header 'set-cookie'", async () => {
      const res = reply.cookies({ hello: "world" }).send();
      expect(res.headers.get("set-cookie")).toBe("hello=world;Path=/");
    });
  });

  describe(".download()", () => {
    it("allows a simple download", async () => {
      const res = reply.download("hello.txt").send("Hello world");
      expect(await res.text()).toBe("Hello world");
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.txt"',
      );
    });

    it("manually sets the content type", () => {
      const res = reply
        .type("text/plain")
        .download("hello.md")
        .send("Hello world");
      expect(res.headers.get("content-type")).toBe("text/plain");
    });

    it("manually sets the content type AFTER the fact", () => {
      const res = reply
        .download("hello.md")
        .type("text/plain")
        .send("Hello world");
      expect(res.headers.get("content-type")).toBe("text/plain");
    });

    it("automatically infers the content type AFTER the fact", () => {
      const res = reply.download("hello.md").send("Hello world");
      expect(res.headers.get("content-type")).toBe("text/markdown");
    });
  });
});
