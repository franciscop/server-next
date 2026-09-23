import { once } from "node:events";
import server from "../index";
import { Node } from "./handlers";

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

  // Node's request has no signal of its own: the adapter aborts ctx.signal
  // when the socket closes before the response is done
  it("aborts on Node when the client hangs up", async () => {
    let seen: AbortSignal | undefined;
    const port = 8795;
    const app = server({ port, log: false }).get("/", async (ctx) => {
      seen = ctx.signal;
      await new Promise((done) => setTimeout(done, 200));
      return "too late";
    });
    const http = await Node(app);
    if (!http.listening) await once(http, "listening");

    const controller = new AbortController();
    const req = fetch(`http://localhost:${port}/`, {
      signal: controller.signal,
    }).catch(() => {});
    await new Promise((done) => setTimeout(done, 50));
    expect(seen?.aborted).toBe(false);
    controller.abort();
    await req;
    await new Promise((done) => setTimeout(done, 50));
    expect(seen?.aborted).toBe(true);
    http.close();
  });
});

// A client that hangs up mid-request cancels the work, so whatever that work
// threw is a consequence of leaving rather than a fault worth rendering.
describe("an abandoned request", () => {
  const gone = () => {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  };

  it("does not call onError for what the abort knocked over", async () => {
    let calls = 0;
    const app = server({
      log: false,
      onError: () => {
        calls++;
        return new Response("handled", { status: 500 });
      },
    }).get("/boom", () => {
      throw new Error("upstream died");
    });

    // The same throw still reaches onError while someone is listening
    const normal = await app.fetch(new Request("http://localhost/boom"));
    expect(normal?.status).toBe(500);
    expect(calls).toBe(1);

    // ...and is dropped once they are not
    // The response is only there to be a Response: nobody reads it
    const res = await app.fetch(
      new Request("http://localhost/boom", { signal: gone() }),
    );
    expect(res?.status).toBe(499);
    expect(calls).toBe(1);
  });

  it("leaves a healthy request alone", async () => {
    const app = server({ log: false }).get("/", () => "fine");
    const res = await app.fetch(new Request("http://localhost/"));
    expect(res?.status).toBe(200);
    expect(await res!.text()).toBe("fine");
  });
});
