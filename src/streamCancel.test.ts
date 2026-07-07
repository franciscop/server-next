import server from ".";

// When a consumer goes away mid-stream, the async-generator body backing the
// response must run its `finally {}` so it releases resources (a subscription,
// an interval, ...). Previously the ReadableStream's cancel() only logged, so
// the generator was never returned and a `while (true)` producer leaked.
//
// Both runtimes end up cancelling the response's ReadableStream on disconnect
// (the web runtimes directly; the Node adapter via reader.cancel() on `close`),
// so cancelling the reader here exercises the shared cleanup path.
describe("stream cancellation cleanup", () => {
  it("runs the generator's finally when the stream is cancelled", async () => {
    let cleaned = false;
    const app = server().get(
      "/stream",
      // Async-generator bodies stream at runtime (parseResponse handles them)
      // but aren't in the middleware return type yet, hence the cast.
      () =>
        (async function* () {
          try {
            let i = 0;
            while (true) {
              yield `data: ${i++}\n\n`;
              await new Promise((r) => setTimeout(r, 5));
            }
          } finally {
            cleaned = true;
          }
        })() as any,
    );

    const res = await app.test().get("/stream");
    const reader = res.body!.getReader();
    await reader.read(); // receive one event
    await reader.cancel(); // consumer "disconnects"

    await new Promise((r) => setTimeout(r, 20));
    expect(cleaned).toBe(true);
  });
});
