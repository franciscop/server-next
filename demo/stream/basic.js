// server.ts
async function* generateStream() {
  for (let i = 1; i <= 5; i++) {
    console.log(`Part ${i}`); // Log to verify each yield
    yield `Chunk ${i}: Hello from Bun!\n`;
    await Bun.sleep(1000); // Simulate async work
  }
}

function asyncIteratorToReadable(asyncGenerator) {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await asyncGenerator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(new TextEncoder().encode(value));
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
      }
    },
    cancel() {
      console.log("Stream cancelled");
    },
  });
}

const server = Bun.serve({
  port: 3000,
  async fetch() {
    return new Response(asyncIteratorToReadable(generateStream()), {
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
});
