import server from "..";
import ServerError from "./index";

const html = { accept: "text/html,application/xhtml+xml" };

const quiet = async <T>(fn: () => Promise<T>): Promise<[T, string]> => {
  const lines: string[] = [];
  const real = console.error;
  console.error = (...args: any[]) => lines.push(args.join(" "));
  const out = await fn();
  console.error = real;
  return [out, lines.join("\n")];
};

// A 4xx says what the client got wrong, so it is theirs to read. A 5xx says
// what went wrong here, so only the status crosses the wire.
describe("what reaches the client", () => {
  it("sends a 4xx message, which describes their request", async () => {
    const api = server({ security: { maxBodySize: "10b" } })
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", "x".repeat(50), {
      headers: { "content-type": "text/plain" },
    });
    expect(res.status).toBe(413);
    expect(await res.text()).toBe("Request body exceeds the 10b limit");
  });

  it("never sends a 4xx hint, which is for whoever configured the app", async () => {
    const api = server({ security: { maxBodySize: "10b" } })
      .post("/", (ctx) => ctx.body)
      .test();
    const body = await (
      await api.post("/", "x".repeat(50), {
        headers: { "content-type": "text/plain" },
      })
    ).text();
    expect(body).not.toContain("maxBodySize");
  });

  it("replaces a 5xx message with a plain status", async () => {
    const [res] = await quiet(() =>
      server()
        .get("/", () => {
          throw new Error("connection to 10.0.0.5 refused");
        })
        .test()
        .get("/"),
    );
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Server Error");
  });

  it("logs the 5xx it hid, with its hint and its docs link", async () => {
    const [, logged] = await quiet(() =>
      server()
        .post("/", (ctx) => ctx.body)
        .test()
        .post("/", "x", { headers: { "content-type": "multipart/form-data" } }),
    );
    // that one is a 400, so nothing is logged; a real 5xx is
    const [, five] = await quiet(() =>
      server()
        .get("/", () => {
          throw ServerError.UPLOAD_NOT_CONFIGURED({ name: "a.png" });
        })
        .test()
        .get("/"),
    );
    expect(five).toContain("UPLOAD_NOT_CONFIGURED");
    expect(five).toContain("uploads: './uploads'");
    expect(five).toContain("documentation/errors#upload_not_configured");
    expect(logged).toBe("");
  });
});

// In development the person reading the response is the one who can fix it
describe("the development error page", () => {
  it("renders the message, the hint and a link to the docs", async () => {
    const api = server({ security: { maxBodySize: "10b" } })
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", "x".repeat(50), {
      headers: { ...html, "content-type": "text/plain" },
    });
    const page = await res.text();

    expect(res.status).toBe(413);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(page).toContain("Request body exceeds the 10b limit");
    expect(page).toContain("maxBodySize");
    expect(page).toContain("documentation/errors#body_too_large");
  });

  it("stays out of the way of anything that is not a browser", async () => {
    const api = server({ security: { maxBodySize: "10b" } })
      .post("/", (ctx) => ctx.body)
      .test();
    const res = await api.post("/", "x".repeat(50), {
      headers: { accept: "application/json", "content-type": "text/plain" },
    });
    expect(await res.text()).toBe("Request body exceeds the 10b limit");
  });

  it("escapes what it renders", async () => {
    const [res] = await quiet(() =>
      server()
        .get("/", () => {
          throw new Error("<script>alert(1)</script>");
        })
        .test()
        .get("/", { headers: html }),
    );
    const page = await res.text();
    expect(page).not.toContain("<script>alert(1)</script>");
    expect(page).toContain("&lt;script&gt;");
  });
});

describe("the catalogue", () => {
  it("gives every code a hint", () => {
    const codes = Object.keys(ServerError).filter((k) => /^[A-Z_]+$/.test(k));
    expect(codes.length).toBeGreaterThan(10);
    for (const code of codes) {
      expect(ServerError[code]().hint, `${code} has no hint`).toBeTruthy();
    }
  });

  it("carries the hint on the error itself", () => {
    expect(ServerError.UPLOAD_TOO_LARGE({ limit: "1mb" }).hint).toContain(
      "maxFileSize",
    );
  });
});

// The reference is only useful if it stays complete
describe("the docs page", () => {
  it("documents every registered code", async () => {
    const doc = await Bun.file("docs/8. Errors.md").text();
    const documented = [...doc.matchAll(/^### ([A-Z_]+)$/gm)].map((m) => m[1]);
    const codes = Object.keys(ServerError).filter((k) => /^[A-Z_]+$/.test(k));
    for (const code of codes) {
      expect(documented, `${code} is missing from docs/8. Errors.md`).toContain(code);
    }
  });
});

// The one an app hits most, and the only one with an answer in app code
describe("NOT_FOUND", () => {
  it("is a catalogue code, so it carries a hint like the rest", async () => {
    const res = await server({ log: false })
      .get("/", () => "hi")
      .test()
      .get("/nope", { headers: html });
    const page = await res.text();
    expect(res.status).toBe(404);
    expect(page).toContain("MissingPage");
    expect(page).toContain("documentation/errors#not_found");
  });

  it("still answers a non-browser with the plain status", async () => {
    const res = await server({ log: false })
      .get("/", () => "hi")
      .test()
      .get("/nope");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
  });
});

// The page prints a message, a stack, a path and a code, none of which it
// controls. Anything that escapes into markup would run on the developer's
// own origin, so this is checked rather than assumed.
describe("the development page is inert", () => {
  const page = async (fn: any, path = "/") => {
    const [res] = await (async () => {
      const lines: string[] = [];
      const real = console.error;
      console.error = (...a: any[]) => lines.push(a.join(" "));
      const r = await server({ log: false }).get(fn).test().get(path, { headers: html });
      console.error = real;
      return [r];
    })();
    return { res, body: await res.text() };
  };

  it("escapes a message that is markup", async () => {
    const { body } = await page(() => {
      throw new Error("<img src=x onerror=alert(1)>");
    });
    expect(body).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(body).not.toContain("<img src=x");
  });

  it("does not let a code break out of the docs link", async () => {
    const { body } = await page(() => {
      throw new ServerError('X" onmouseover="alert(1)', 400, "hi");
    });
    expect(body).not.toContain('onmouseover="alert(1)"');
    // Not a real code, so it is not linked at all
    expect(body).not.toContain("documentation/errors#x");
  });

  it("cannot be reached through the path, which stays encoded", async () => {
    const { body } = await page(() => {
      throw new Error("nope");
    }, "/%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    expect(body).not.toContain("<script>");
    expect(body).toContain("%3Cscript%3E");
  });

  it("answers 500 for a status that is not a number, rather than crashing", async () => {
    const { res } = await page(() => {
      const error: any = new Error("hi");
      error.status = '400"><script>alert(1)</script>';
      throw error;
    });
    expect(res.status).toBe(500);
  });

  it("forbids scripts and fetches with a policy of its own", async () => {
    const { res } = await page(() => {
      throw new Error("nope");
    });
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("base-uri 'none'");
  });
});
