import server, { cache, cookies, download, headers, json, redirect, send, status, type } from ".";

describe("null-body statuses", () => {
  // 204/205/304/101 must not carry a body, or Node/undici throws when building
  // the Response. Bun is lenient, so this guards against a Node-only 500.
  for (const code of [204, 205, 304]) {
    it(`send() produces a bodyless ${code}`, () => {
      const res = status(code).send();
      expect(res.status).toBe(code);
      expect(res.body).toBe(null);
    });

    it(`serves a ${code} over the app`, async () => {
      const res = await server()
        .get("/", () => status(code).send())
        .test()
        .get("/");
      expect(res.status).toBe(code);
      expect(await res.text()).toBe("");
    });
  }
});

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
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    });

    it("renders a JSX element as html", async () => {
      // JSX elements are thunks, the same ones a route can return directly
      const element = () => "<div>Hi</div>";
      const res = send(element);
      expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await res.text()).toBe("<div>Hi</div>");
    });

    it("keeps the status and headers set before a JSX body", async () => {
      const res = status(201).headers("x-a", "1").send(() => "<p>ok</p>");
      expect(res.status).toBe(201);
      expect(res.headers.get("x-a")).toBe("1");
      expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await res.text()).toBe("<p>ok</p>");
    });

    it("refuses a promise instead of serializing it", () => {
      // send() is sync; an async component has to be awaited or returned
      expect(() => send(async () => "<p>hi</p>")).toThrow(/async component/);
      expect(() => send(Promise.resolve("x"))).toThrow(/async component/);
    });

    it("send(null) sends an empty body, like new Response(null)", async () => {
      const res = send(null);
      expect(await res.text()).toBe("");
      expect(res.headers.get("content-type")).not.toContain("json");
    });

    it("only sniffs markup-like strings as HTML", async () => {
      // '<' alone isn't markup: '<3' must stay plain text, tags stay HTML
      expect(send("<3 you all").headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(send("<h1>hi</h1>").headers.get("content-type")).toBe("text/html; charset=utf-8");
      const res = await server()
        .get("/", () => "<3 you all")
        .test()
        .get("/");
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    });
  });

  describe("headers()", () => {
    it("overwrites when setting the same key twice", () => {
      const res = headers("x-v", "1").headers("x-v", "2").send("x");
      expect(res.headers.get("x-v")).toBe("2");
    });

    it("sends multiple values with an array", () => {
      const res = headers("link", ["<a>", "<b>"]).send("x");
      expect(res.headers.get("link")).toBe("<a>, <b>");
    });
  });

  describe("json()", () => {
    it("sends application/json exactly once, even after type('json')", () => {
      const res = type("json").json({ a: 1 });
      expect(res.headers.get("content-type")).toBe("application/json");
    });

    it("keeps an explicitly set content-type", async () => {
      const res = headers("content-type", "text/plain").json({ a: 1 });
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(await res.text()).toBe('{"a":1}');
    });

    it("serializes undefined as null, keeping the body valid JSON", async () => {
      const res = json(undefined);
      expect(await res.text()).toBe("null");
      expect(res.headers.get("content-type")).toBe("application/json");
    });
  });

  describe("redirect()", () => {
    it("sends a 302 with the Location header", () => {
      const res = redirect("/new");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/new");
    });

    it("keeps an explicitly set status", () => {
      const res = status(301).redirect("/moved");
      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe("/moved");
    });

    it("sends a single Location, the last one written", () => {
      const res = headers("location", "/x").redirect("/y");
      expect(res.headers.get("location")).toBe("/y");
    });
  });

  describe("cache()", () => {
    it("the last cache-control write wins, no merging", () => {
      const res = cache("1h").headers("cache-control", "no-store").send("x");
      expect(res.headers.get("cache-control")).toBe("no-store");
    });
  });

  describe("cookies()", () => {
    it("work as expected", async () => {
      const api = server()
        .get("/", () => cookies({ hello: "world" }).send())
        .test();
      const res = await api.get("/");
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
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

    it("encodes reserved characters in values", () => {
      // ';' would otherwise end the value and silently truncate it
      const res = cookies("token", "abc;def").send();
      expect(res.headers.get("set-cookie")).toBe("token=abc%3Bdef;Path=/");
    });

    it("keeps falsy values", () => {
      const res = cookies("count", 0 as any).send();
      expect(res.headers.get("set-cookie")).toBe("count=0;Path=/");
    });

    it("round-trips a value through ctx.cookies", async () => {
      // What goes out encoded must come back as the original string
      const app = server()
        .post("/set", () => cookies("data", "a;b,c=d 100%").send())
        .get("/read", (ctx) => ctx.cookies.data);

      const set = await app.test().post("/set");
      const cookie = set.headers.get("set-cookie")!.split(";")[0];
      const res = await app.test().get("/read", { headers: { cookie } });
      expect(await res.text()).toBe("a;b,c=d 100%");
    });

    it("reads a cookie that was not encoded by us", async () => {
      // A '%' not starting an escape would throw in decodeURIComponent
      const res = await server()
        .get("/", (ctx) => ctx.cookies.discount)
        .test()
        .get("/", { headers: { cookie: "discount=100%" } });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("100%");
    });
  });

  describe("download()", () => {
    it("prompts a download for plain text", async () => {
      const res = download().send("Hi");
      expect(await res.text()).toBe("Hi");
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(res.headers.get("content-disposition")).toBe("attachment");
    });

    it("prompts a download with filename", async () => {
      const res = download("hello.md").send("Hi");
      expect(await res.text()).toBe("Hi");
      expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("automatically infers the content type", () => {
      const res = download("hello.md").send("Hi");
      expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
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

    it("infers content-type from extension without any prior type() call", () => {
      // If the ext-inference guard is broken, content-type would be absent or wrong
      const res = download("report.pdf").send("data");
      expect(res.headers.get("content-type")).toBe("application/pdf");
    });

    it("does not set content-type when called without a filename", () => {
      // download() with no name should never inject a content-type
      const res = download().send();
      expect(res.headers.get("content-disposition")).toBe("attachment");
      // content-type comes from send(), not from download()
      expect(res.headers.get("content-type")).not.toBeNull();
      // but it is NOT set to a file-derived type
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    });

    it("keeps spaces readable in the saved filename", () => {
      // filename= is a quoted string; browsers do not percent-decode it
      const res = download("my file.csv").send("a,b");
      expect(res.headers.get("content-disposition")).toBe('attachment; filename="my file.csv"');
    });

    it("sends non-ASCII names via RFC 5987 filename*", () => {
      const res = download("résumé.pdf").send("x");
      const cd = res.headers.get("content-disposition") || "";
      expect(cd).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9.pdf");
      expect(cd).not.toContain('filename="r%C3%A9sum%C3%A9.pdf"');
    });

    it("an explicit content-disposition wins over download()'s", () => {
      const res = download("a.txt").headers("content-disposition", "inline").send("x");
      expect(res.headers.get("content-disposition")).toBe("inline");
    });

    it("escapes quotes in the filename", () => {
      // An unescaped quote would end the parameter early
      const res = download('say "hi".txt').send("x");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="say \\"hi\\".txt"',
      );
    });

    it("strips CRLF from the filename", () => {
      // Newlines in a header value would let the name inject other headers
      const res = download("evil\r\nX-Injected: 1.txt").send("x");
      const cd = res.headers.get("content-disposition") || "";
      expect(cd).not.toContain("\n");
      expect(res.headers.get("x-injected")).toBeNull();
    });

    it("sends only the filename, never a path", () => {
      const res = download("../../etc/passwd").send("x");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="passwd"',
      );
    });

    it("percent-encodes characters RFC 5987 excludes", () => {
      // encodeURIComponent leaves ' ( ) * alone, but attr-char forbids them
      const res = download("wow(*).pdf").send("x");
      const cd = res.headers.get("content-disposition") || "";
      expect(cd).toContain("filename=\"wow(*).pdf\"");
      expect(cd).not.toContain("filename*");
    });

    it("adds filename* only for non-ASCII names", () => {
      const plain = download("report.csv").send("x");
      expect(plain.headers.get("content-disposition")).toBe(
        'attachment; filename="report.csv"',
      );
      const uni = download("日本語(1).pdf").send("x");
      const cd = uni.headers.get("content-disposition") || "";
      expect(cd).toContain('filename="???(1).pdf"');
      expect(cd).toContain("filename*=UTF-8''%E6%97%A5%E6%9C%AC%E8%AA%9E%281%29.pdf");
    });
  });
});

describe("returning a bare Reply (no terminal call)", () => {
  // A handler may return a chainable helper directly, e.g. `return status(401)`,
  // and it is finalized as if `.send()` had been called (empty body).
  it("returns a bare status() as that status", async () => {
    const res = await server()
      .get("/", () => status(401))
      .test()
      .get("/");
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("");
  });

  it("keeps headers set on a bare type()", async () => {
    const res = await server()
      .get("/", () => type("html"))
      .test()
      .get("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("emits the cookie set on a bare cookies()", async () => {
    const res = await server()
      .get("/", () => cookies("token", "abc"))
      .test()
      .get("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("token=abc");
  });
});
