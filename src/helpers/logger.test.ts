import server, { redirect } from "..";
import createLogger from "./logger";

// Assert on plain text, not ANSI color codes
process.env.NO_COLOR = "1";

// Capture everything written to console.log while `fn` runs
async function captureLogs(fn: () => unknown | Promise<unknown>) {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => logs.push(args.join(" "));
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return logs;
}

describe("log option", () => {
  it("logs nothing by default", async () => {
    const logs = await captureLogs(() =>
      server()
        .get("/", () => "hi")
        .test()
        .get("/"),
    );
    expect(logs).toEqual([]);
  });

  it("logs requests at the info level", async () => {
    const logs = await captureLogs(() =>
      server({ log: "info" })
        .get("/hello", () => "Hello world")
        .test()
        .get("/hello"),
    );
    const api = logs.find((l) => l.includes("[server:api]"));
    expect(api).toContain("GET /hello");
    expect(api).toContain("200 OK");
    expect(api).toContain("11b"); // "Hello world" is 11 bytes
  });

  it("logs the request and response sizes", async () => {
    const logs = await captureLogs(() =>
      server({ log: "info" })
        .post("/echo", () => "ok")
        .test()
        .post("/echo", "hello"),
    );
    const api = logs.find((l) => l.includes("[server:api]"));
    expect(api).toContain("POST /echo");
    expect(api).toContain("5b"); // request body "hello"
    expect(api).toContain("2b"); // response "ok"
  });

  it("shows the redirect target for a 3xx", async () => {
    const logs = await captureLogs(() =>
      server({ log: "info" })
        .get("/old", () => redirect("/new"))
        .test()
        .get("/old"),
    );
    const api = logs.find((l) => l.includes("[server:api]"));
    expect(api).toContain("302");
    expect(api).toContain("→ /new");
  });

  it("logs configured modules on startup", async () => {
    const logs = await captureLogs(() => {
      server({ log: "info", uploads: "./uploads", cors: "*" });
    });
    expect(logs.some((l) => l.includes("[server:uploads] ./uploads"))).toBe(
      true,
    );
    expect(logs.some((l) => l.includes("[server:cors] *"))).toBe(true);
  });

  it("can be enabled via the LOG_LEVEL env var", async () => {
    globalThis.env.LOG_LEVEL = "info";
    try {
      const logs = await captureLogs(() =>
        server()
          .get("/", () => "hi")
          .test()
          .get("/"),
      );
      expect(logs.some((l) => l.includes("[server:api]"))).toBe(true);
    } finally {
      delete globalThis.env.LOG_LEVEL;
    }
  });
});

describe("createLogger", () => {
  it("formats the start line", async () => {
    const logs = await captureLogs(() => {
      createLogger("info").start("http://localhost:3000/");
    });
    expect(logs).toContain("[server:start] http://localhost:3000/");
  });

  it("logs nothing when no level is given", async () => {
    const logs = await captureLogs(() => {
      const log = createLogger();
      log.message("test", "hello");
      log.start("http://localhost:3000/");
    });
    expect(logs).toEqual([]);
  });
});
