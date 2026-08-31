import { Readable } from "node:stream";
import server from "../index";
import createNode from "./node";

describe("ctx.signal", () => {
  it("is an AbortSignal, not aborted on a normal request", async () => {
    const api = server()
      .get("/", (ctx) => ({
        isSignal: ctx.signal instanceof AbortSignal,
        aborted: ctx.signal.aborted,
      }))
      .test();
    expect(await (await api.get("/")).json()).toEqual({
      isSignal: true,
      aborted: false,
    });
  });

  it("follows the request's own signal", async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const api = server()
      .get("/", async (ctx) => {
        seen = ctx.signal;
        await new Promise((done) => setTimeout(done, 20));
        return { aborted: ctx.signal.aborted };
      })
      .test();
    const req = api.get("/", { signal: controller.signal });
    setTimeout(() => controller.abort(), 5);
    expect(await (await req).json()).toEqual({ aborted: true });
    expect(seen?.aborted).toBe(true);
  });

  it("the Node builder carries the caller's signal", async () => {
    const req = Readable.from([]) as any;
    req.method = "GET";
    req.url = "/";
    req.rawHeaders = ["host", "localhost"];
    req.socket = { remoteAddress: "127.0.0.1" };

    const controller = new AbortController();
    const ctx = await createNode(req, server() as any, controller.signal);
    expect(ctx.signal.aborted).toBe(false);
    controller.abort();
    expect(ctx.signal.aborted).toBe(true);

    // Without one it still exposes a (never-aborting) signal
    const bare = await createNode(req, server() as any);
    expect(bare.signal).toBeInstanceOf(AbortSignal);
    expect(bare.signal.aborted).toBe(false);
  });
});
