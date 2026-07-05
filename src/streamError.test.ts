import server from ".";

// Regression for the Node adapter not wrapping its streaming write: when a
// response body stream errors mid-flight, `iterate()` throws and the request
// callback rejects (unhandled), and response.end() is never called so the
// response hangs. Expected to FAIL until handlers.Node guards the stream write.
describe("streaming response errors (Node adapter)", () => {
  it("does not hang or leave an unhandled rejection when a body stream errors", async () => {
    const port = 8788;
    const app = server({ port }).get(
      "/boom",
      () =>
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode("partial"));
          },
          pull(c) {
            c.error(new Error("stream boom"));
          },
        }),
    );
    const httpServer: any = await (app as any).node();

    const rejections: unknown[] = [];
    const onRej = (e: unknown) => rejections.push(e);
    process.on("unhandledRejection", onRej);

    try {
      // The response must terminate (not hang) despite the stream error.
      const text = await Promise.race([
        fetch(`http://localhost:${port}/boom`).then((r) => r.text()),
        new Promise<string>((_, rej) =>
          setTimeout(() => rej(new Error("response hung")), 1500),
        ),
      ]).catch((e) => (e as Error).message);

      await new Promise((r) => setTimeout(r, 100)); // let a rejection surface

      expect(rejections).toEqual([]);
      expect(text).not.toBe("response hung");
    } finally {
      process.off("unhandledRejection", onRej);
      httpServer.close();
    }
  });
});
