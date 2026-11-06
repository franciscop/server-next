import server, { headers, sse } from "..";

// Reads a stream until `count` events (blank-line terminated) have arrived
async function readEvents(res: Response, count: number): Promise<string[]> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (text.split("\n\n").length - 1 < count) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  reader.releaseLock();
  return text.split("\n\n").slice(0, count);
}

const tick = () => new Promise((r) => setTimeout(r, 10));

describe("sse()", () => {
  it("answers with the event-stream headers", async () => {
    const res = await server()
      .get("/", () => sse(() => {}))
      .test()
      .get("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    await res.body!.cancel();
  });

  it("sends unnamed and named events, objects as JSON", async () => {
    const res = await server()
      .get("/", () =>
        sse((send) => {
          send({ now: 1 });
          send("chat", { text: "hi" });
          send("plain text");
        }),
      )
      .test()
      .get("/");
    expect(await readEvents(res, 3)).toEqual([
      'data: {"now":1}',
      'event: chat\ndata: {"text":"hi"}',
      "data: plain text",
    ]);
    await res.body!.cancel();
  });

  it("splits data with line breaks across data lines", async () => {
    const res = await server()
      .get("/", () => sse((send) => send("one\ntwo")))
      .test()
      .get("/");
    expect(await readEvents(res, 1)).toEqual(["data: one\ndata: two"]);
    await res.body!.cancel();
  });

  it("refuses an event name that would break the format", async () => {
    let error: any;
    const res = await server()
      .get("/", () =>
        sse((send) => {
          try {
            send("chat\ndata: injected", {});
          } catch (e) {
            error = e;
          }
        }),
      )
      .test()
      .get("/");
    expect(String(error)).toMatch(/event name/i);
    await res.body!.cancel();
  });

  it("runs the returned cleanup once when the client disconnects", async () => {
    let cleaned = 0;
    const res = await server()
      .get("/", () => sse(() => () => cleaned++))
      .test()
      .get("/");
    await res.body!.cancel();
    await tick();
    expect(cleaned).toBe(1);
  });

  it("runs the cleanup when the request is aborted, only once", async () => {
    let cleaned = 0;
    const app = server().get("/", () => sse(() => () => cleaned++));
    const abort = new AbortController();
    const res = await app.fetch(
      new Request("http://localhost/", { signal: abort.signal }),
    );
    abort.abort();
    await res.body!.cancel();
    await tick();
    expect(cleaned).toBe(1);
  });

  it("waits for an async start, and cleans up even after an early leave", async () => {
    let cleaned = 0;
    const res = await server()
      .get("/", () =>
        sse(async () => {
          await tick();
          return () => cleaned++;
        }),
      )
      .test()
      .get("/");
    await res.body!.cancel();
    await tick();
    await tick();
    expect(cleaned).toBe(1);
  });

  it("ignores sends after the client left", async () => {
    let later: ((data: unknown) => void) | undefined;
    const res = await server()
      .get("/", () =>
        sse((send) => {
          later = send;
        }),
      )
      .test()
      .get("/");
    await res.body!.cancel();
    expect(() => later!({ late: true })).not.toThrow();
  });

  it("logs a start that throws and closes the stream", async () => {
    const logged: string[] = [];
    const realError = console.error;
    console.error = (...args: any[]) => logged.push(args.join(" "));
    try {
      const res = await server()
        .get("/", () =>
          sse(() => {
            throw new Error("boom");
          }),
        )
        .test()
        .get("/");
      expect(await res.text()).toBe("");
      expect(logged.join(" ")).toContain("boom");
    } finally {
      console.error = realError;
    }
  });

  it("keeps a quiet connection alive with a ping every 15 seconds", async () => {
    const realSetInterval = globalThis.setInterval;
    let ping: (() => void) | undefined;
    globalThis.setInterval = ((fn: () => void, ms: number) => {
      if (ms === 15_000) ping = fn;
      return realSetInterval(() => {}, 1_000_000);
    }) as typeof setInterval;
    try {
      const res = await server()
        .get("/", () => sse(() => {}))
        .test()
        .get("/");
      ping!();
      expect(await readEvents(res, 1)).toEqual([": ping"]);
      await res.body!.cancel();
    } finally {
      globalThis.setInterval = realSetInterval;
    }
  });

  it("lifts Bun's idle timeout for this request only", async () => {
    const calls: [Request, number][] = [];
    const bun = {
      timeout: (req: Request, seconds: number) => calls.push([req, seconds]),
      requestIP: () => ({ address: "127.0.0.1" }),
    };
    const app = server()
      .get("/events", () => sse(() => {}))
      .get("/", () => "hi");

    await app.fetch(new Request("http://localhost/"), bun as any);
    expect(calls).toEqual([]);

    const req = new Request("http://localhost/events");
    const res = await app.fetch(req, bun as any);
    expect(calls).toEqual([[req, 0]]);
    await res.body!.cancel();
  });

  it("keeps headers set earlier in the chain", async () => {
    const res = await server()
      .get("/", () => headers("x-stream", "yes").sse(() => {}))
      .test()
      .get("/");
    expect(res.headers.get("x-stream")).toBe("yes");
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    await res.body!.cancel();
  });
});
