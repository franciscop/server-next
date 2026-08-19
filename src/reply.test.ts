import server, { cache, cookies, download, headers, json, redirect, send, status, type } from ".";

describe("null-body statuses", () => {
  // 204/205/304/101 must not carry a body, or Node/undici throws when building
  // the Response. Bun is lenient, so this guards against a Node-only 500.
  for (const code of [204, 205, 304]) {
    it(`send() produces a bodyless ${code}`, async () => {
      const res = await status(code).send();
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
    it("returns a Response", async () => {
      const res = await send();
      expect(res instanceof Response).toBe(true);
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    });

    it("renders a JSX element as html", async () => {
      // JSX elements are thunks, the same ones a route can return directly
      const element = () => "<div>Hi</div>";
      const res = await send(element);
      expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await res.text()).toBe("<div>Hi</div>");
    });

    it("keeps the status and headers set before a JSX body", async () => {
      const res = await status(201).headers("x-a", "1").send(() => "<p>ok</p>");
      expect(res.status).toBe(201);
      expect(res.headers.get("x-a")).toBe("1");
      expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await res.text()).toBe("<p>ok</p>");
    });

    it("refuses an async component, which cannot be rendered", async () => {
      // Invalid input by type, which is the point: check the runtime guard
      await expect(send((async () => "<p>hi</p>") as any)).rejects.toThrow(
        /async component/,
      );
    });

    it("awaits a promise, so send(fetch(url)) needs no await", async () => {
      const res = await send(Promise.resolve("resolved"));
      expect(await res.text()).toBe("resolved");

      const proxied = await send(
        Promise.resolve(new Response("upstream", { status: 201 })),
      );
      expect(proxied.status).toBe(201);
      expect(await proxied.text()).toBe("upstream");
    });

    it("send(null) sends an empty body, like new Response(null)", async () => {
      const res = await send(null);
      expect(await res.text()).toBe("");
      expect(res.headers.get("content-type")).not.toContain("json");
    });

    it("only sniffs markup-like strings as HTML", async () => {
      // '<' alone isn't markup: '<3' must stay plain text, tags stay HTML
      expect((await send("<3 you all")).headers.get("content-type")).toBe(
        "text/plain; charset=utf-8",
      );
      expect((await send("<h1>hi</h1>")).headers.get("content-type")).toBe(
        "text/html; charset=utf-8",
      );
      const res = await server()
        .get("/", () => "<3 you all")
        .test()
        .get("/");
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    });
  });

  describe("headers()", () => {
    it("overwrites when setting the same key twice", async () => {
      const res = await headers("x-v", "1").headers("x-v", "2").send("x");
      expect(res.headers.get("x-v")).toBe("2");
    });

    it("sends multiple values with an array", async () => {
      const res = await headers("link", ["<a>", "<b>"]).send("x");
      expect(res.headers.get("link")).toBe("<a>, <b>");
    });
  });

  describe("json()", () => {
    it("sends application/json exactly once, even after type('json')", async () => {
      const res = await type("json").json({ a: 1 });
      expect(res.headers.get("content-type")).toBe("application/json");
    });

    it("keeps an explicitly set content-type", async () => {
      const res = await headers("content-type", "text/plain").json({ a: 1 });
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(await res.text()).toBe('{"a":1}');
    });

    it("serializes undefined as null, keeping the body valid JSON", async () => {
      const res = await json(undefined);
      expect(await res.text()).toBe("null");
      expect(res.headers.get("content-type")).toBe("application/json");
    });
  });

  describe("redirect()", () => {
    it("sends a 302 with the Location header", async () => {
      const res = await redirect("/new");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/new");
    });

    it("keeps an explicitly set status", async () => {
      const res = await status(301).redirect("/moved");
      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe("/moved");
    });

    it("sends a single Location, the last one written", async () => {
      const res = await headers("location", "/x").redirect("/y");
      expect(res.headers.get("location")).toBe("/y");
    });
  });

  describe("cache()", () => {
    it("the last cache-control write wins, no merging", async () => {
      const res = await cache("1h").headers("cache-control", "no-store").send("x");
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

    it("uses the header 'set-cookie'", async () => {
      const res = await cookies({ hello: "world" }).send();
      expect(res.headers.get("set-cookie")).toBe("hello=world;Path=/");
    });

    it("can set a cookie with path", async () => {
      const res = await cookies({ hello: { value: "world", path: "/hello" } }).send();
      expect(res.headers.get("set-cookie")).toBe("hello=world;Path=/hello");
    });

    it("can set a cookie with path", async () => {
      const res = await cookies({ h: { value: "b", path: "/hello/world" } }).send();
      expect(res.headers.get("set-cookie")).toBe("h=b;Path=/hello/world");
    });

    it("can set a cookie with expires (number)", async () => {
      const res = await cookies({ hello: { value: "world", expires: 5000 } }).send();
      const diff = getExpiresDiff(res.headers.get("set-cookie"));
      expect(diff).toBeGreaterThanOrEqual(3900);
      expect(diff).toBeLessThanOrEqual(5100);
    });

    it("can set a cookie with expires (string)", async () => {
      const res = await cookies({ hello: { value: "w", expires: "5weeks" } }).send();
      const diff = getExpiresDiff(res.headers.get("set-cookie"));
      const fiveWeeks = 5 * 7 * 24 * 3600 * 1000;
      expect(diff).toBeGreaterThanOrEqual(fiveWeeks - 1100);
      expect(diff).toBeLessThanOrEqual(fiveWeeks + 1000);
    });

    it("can set a cookie with expires (Date)", async () => {
      const expires = new Date("2000-01-01");
      const res = await cookies({ hello: { value: "w", expires } }).send();
      expect(res.headers.get("set-cookie")).toContain(
        "Sat, 01 Jan 2000 00:00:00 GMT",
      );
    });

    it("can set a cookie with expires (string Date)", async () => {
      const expires = "Sat, 01 Jan 2000 00:00:00 GMT";
      const res = await cookies({ hello: { value: "w", expires } }).send();
      expect(res.headers.get("set-cookie")).toContain(
        "Sat, 01 Jan 2000 00:00:00 GMT",
      );
    });

    it("can delete a cookie with expires", async () => {
      const res = await cookies({ hello: { value: "world", expires: 0 } }).send();
      const [, expiresStr] = res.headers
        .get("set-cookie")
        .match(/Expires=([^;]+)/);
      // Very old one to delete/expire it
      expect(expiresStr).toBe(EXPIRED);
    });

    it("can set multiple cookies as an array", async () => {
      const res = await cookies({ hello: ["world", "bye"] }).send();
      expect(res.headers.get("set-cookie")).toBe(
        "hello=world;Path=/, hello=bye;Path=/",
      );
    });

    it("can set multiple cookies by calling it multiple times", async () => {
      const res = await cookies({ hello: "world" }).cookies({ hello: "bye" }).send();
      expect(res.headers.get("set-cookie")).toBe(
        "hello=world;Path=/, hello=bye;Path=/",
      );
    });

    it("can delete a cookie with null", async () => {
      const res = await cookies({ hello: null }).send();
      const [, expiresStr] = res.headers
        .get("set-cookie")
        .match(/Expires=([^;]+)/);
      // Very old one to delete/expire it
      expect(expiresStr).toBe(EXPIRED);
    });

    it("can delete a cookie with null value", async () => {
      const res = await cookies({ hello: { value: null } }).send();
      const [, expiresStr] = res.headers
        .get("set-cookie")
        .match(/Expires=([^;]+)/);
      // Very old one to delete/expire it
      expect(expiresStr).toBe(EXPIRED);
    });

    it("encodes reserved characters in values", async () => {
      // ';' would otherwise end the value and silently truncate it
      const res = await cookies("token", "abc;def").send();
      expect(res.headers.get("set-cookie")).toBe("token=abc%3Bdef;Path=/");
    });

    it("keeps falsy values", async () => {
      const res = await cookies("count", 0 as any).send();
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
      const res = await download().send("Hi");
      expect(await res.text()).toBe("Hi");
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(res.headers.get("content-disposition")).toBe("attachment");
    });

    it("prompts a download with filename", async () => {
      const res = await download("hello.md").send("Hi");
      expect(await res.text()).toBe("Hi");
      expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("automatically infers the content type", async () => {
      const res = await download("hello.md").send("Hi");
      expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("manually sets the content type", async () => {
      const res = await type("text/plain").download("hello.md").send("Hi");
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("manually sets the content type AFTER the fact", async () => {
      const res = await download("hello.md").type("text/plain").send("Hi");
      expect(res.headers.get("content-type")).toBe("text/plain");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.md"',
      );
    });

    it("will just use unknown as the mime", async () => {
      const res = await download("hello.unknown").send("Hi");
      expect(await res.text()).toBe("Hi");
      expect(res.headers.get("content-type")).toBe("unknown");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="hello.unknown"',
      );
    });

    it("infers content-type from extension without any prior type() call", async () => {
      // If the ext-inference guard is broken, content-type would be absent or wrong
      const res = await download("report.pdf").send("data");
      expect(res.headers.get("content-type")).toBe("application/pdf");
    });

    it("does not set content-type when called without a filename", async () => {
      // download() with no name should never inject a content-type
      const res = await download().send();
      expect(res.headers.get("content-disposition")).toBe("attachment");
      // content-type comes from send(), not from download()
      expect(res.headers.get("content-type")).not.toBeNull();
      // but it is NOT set to a file-derived type
      expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    });

    it("keeps spaces readable in the saved filename", async () => {
      // filename= is a quoted string; browsers do not percent-decode it
      const res = await download("my file.csv").send("a,b");
      expect(res.headers.get("content-disposition")).toBe('attachment; filename="my file.csv"');
    });

    it("sends non-ASCII names via RFC 5987 filename*", async () => {
      const res = await download("résumé.pdf").send("x");
      const cd = res.headers.get("content-disposition") || "";
      expect(cd).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9.pdf");
      expect(cd).not.toContain('filename="r%C3%A9sum%C3%A9.pdf"');
    });

    it("an explicit content-disposition wins over download()'s", async () => {
      const res = await download("a.txt").headers("content-disposition", "inline").send("x");
      expect(res.headers.get("content-disposition")).toBe("inline");
    });

    it("escapes quotes in the filename", async () => {
      // An unescaped quote would end the parameter early
      const res = await download('say "hi".txt').send("x");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="say \\"hi\\".txt"',
      );
    });

    it("strips CRLF from the filename", async () => {
      // Newlines in a header value would let the name inject other headers
      const res = await download("evil\r\nX-Injected: 1.txt").send("x");
      const cd = res.headers.get("content-disposition") || "";
      expect(cd).not.toContain("\n");
      expect(res.headers.get("x-injected")).toBeNull();
    });

    it("sends only the filename, never a path", async () => {
      const res = await download("../../etc/passwd").send("x");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="passwd"',
      );
    });

    it("percent-encodes characters RFC 5987 excludes", async () => {
      // encodeURIComponent leaves ' ( ) * alone, but attr-char forbids them
      const res = await download("wow(*).pdf").send("x");
      const cd = res.headers.get("content-disposition") || "";
      expect(cd).toContain("filename=\"wow(*).pdf\"");
      expect(cd).not.toContain("filename*");
    });

    it("adds filename* only for non-ASCII names", async () => {
      const plain = await download("report.csv").send("x");
      expect(plain.headers.get("content-disposition")).toBe(
        'attachment; filename="report.csv"',
      );
      const uni = await download("日本語(1).pdf").send("x");
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
