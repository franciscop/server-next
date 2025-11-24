import server, { cookies, download, send, type } from ".";

const EXPIRED = "Thu, 01 Jan 1970 00:00:00 GMT";

function getExpiresDiff(time: string): number {
  const [, expiresStr] = time.match(/Expires=([^;]+)/);

  // Returns milliseconds rounded to the nearest second when parsing a UTC string from Expires
  const expiresTime = new Date(expiresStr).getTime();
  const now = Date.now();
  return expiresTime - now;
}

describe("Reply", () => {
  describe("send()", () => {
    it("returns a Response", () => {
      const res = send();
      expect(res instanceof Response).toBe(true);
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
      expect(res.headers.get("content-type")).toBe("text/plain");
    });
  });

  describe("cookies()", () => {
    it("work as expected", async () => {
      const api = server()
        .get("/", () => cookies({ hello: "world" }).send())
        .test();
      const res = await api.get("/");
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("set-cookie")).toBe("hello=world;Path=/");
    });

    it("uses the header 'set-cookie'", () => {
      const res = cookies({ hello: "world" }).send();
      expect(res.headers.get("set-cookie")).toBe("hello=world;Path=/");
    });

    it("can set a cookie with path", () => {
      const res = cookies({ hello: { value: "world", path: "/hello" } }).send();
      expect(res.headers.get("set-cookie")).toBe("hello=world;Path=/hello");
    });

    it("can set a cookie with path", () => {
      const res = cookies({ h: { value: "b", path: "/hello/world" } }).send();
      expect(res.headers.get("set-cookie")).toBe("h=b;Path=/hello/world");
    });

    it("can set a cookie with expires (number)", () => {
      const res = cookies({ hello: { value: "world", expires: 5000 } }).send();
      const diff = getExpiresDiff(res.headers.get("set-cookie"));
      expect(diff).toBeGreaterThanOrEqual(3900);
      expect(diff).toBeLessThanOrEqual(5100);
    });

    it("can set a cookie with expires (string)", () => {
      const res = cookies({ hello: { value: "w", expires: "5weeks" } }).send();
      const diff = getExpiresDiff(res.headers.get("set-cookie"));
      const fiveWeeks = 5 * 7 * 24 * 3600 * 1000;
      expect(diff).toBeGreaterThanOrEqual(fiveWeeks - 1100);
      expect(diff).toBeLessThanOrEqual(fiveWeeks + 1000);
    });

    it("can set a cookie with expires (Date)", () => {
      const expires = new Date("2000-01-01");
      const res = cookies({ hello: { value: "w", expires } }).send();
      expect(res.headers.get("set-cookie")).toContain(
        "Sat, 01 Jan 2000 00:00:00 GMT",
      );
    });

    it("can set a cookie with expires (string Date)", () => {
      const expires = "Sat, 01 Jan 2000 00:00:00 GMT";
      const res = cookies({ hello: { value: "w", expires } }).send();
      expect(res.headers.get("set-cookie")).toContain(
        "Sat, 01 Jan 2000 00:00:00 GMT",
      );
    });

    it("can delete a cookie with expires", () => {
      const res = cookies({ hello: { value: "world", expires: 0 } }).send();
      const [, expiresStr] = res.headers
        .get("set-cookie")
        .match(/Expires=([^;]+)/);
      // Very old one to delete/expire it
      expect(expiresStr).toBe(EXPIRED);
    });

    it("can set multiple cookies as an array", () => {
      const res = cookies({ hello: ["world", "bye"] }).send();
      expect(res.headers.get("set-cookie")).toBe(
        "hello=world;Path=/, hello=bye;Path=/",
      );
    });

    it("can set multiple cookies by calling it multiple times", () => {
      const res = cookies({ hello: "world" }).cookies({ hello: "bye" }).send();
      expect(res.headers.get("set-cookie")).toBe(
        "hello=world;Path=/, hello=bye;Path=/",
      );
    });

    it("can delete a cookie with null", () => {
      const res = cookies({ hello: null }).send();
      const [, expiresStr] = res.headers
        .get("set-cookie")
        .match(/Expires=([^;]+)/);
      // Very old one to delete/expire it
      expect(expiresStr).toBe(EXPIRED);
    });

    it("can delete a cookie with null value", () => {
      const res = cookies({ hello: { value: null } }).send();
      const [, expiresStr] = res.headers
        .get("set-cookie")
        .match(/Expires=([^;]+)/);
      // Very old one to delete/expire it
      expect(expiresStr).toBe(EXPIRED);
    });
  });

  describe("download()", () => {
    it("prompts a download for plain text", async () => {
      const res = download().send("Hi");
      expect(await res.text()).toBe("Hi");
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("content-disposition")).toBe("attachment");
    });

    it("prompts a download with filename", async () => {
      const res = download("hello.md").send("Hi");
      expect(await res.text()).toBe("Hi");
      expect(res.headers.get("content-type")).toBe("text/markdown");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("automatically infers the content type", () => {
      const res = download("hello.md").send("Hi");
      expect(res.headers.get("content-type")).toBe("text/markdown");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("manually sets the content type", () => {
      const res = type("text/plain").download("hello.md").send("Hi");
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("manually sets the content type AFTER the fact", () => {
      const res = download("hello.md").type("text/plain").send("Hi");
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("will just use unknown as the mime", async () => {
      const res = download("hello.unknown").send("Hi");
      expect(await res.text()).toBe("Hi");
      expect(res.headers.get("content-type")).toBe("unknown");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.unknown"',
      );
    });
  });
});
