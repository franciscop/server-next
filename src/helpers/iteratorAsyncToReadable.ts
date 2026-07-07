export default function iteratorAsyncToReadable(
  asyncGenerator: AsyncGenerator<any>,
): ReadableStream {
  let cancelled = false;
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await asyncGenerator.next();
        // Cancelled mid-next(): controller is already closed, don't touch it.
        if (cancelled) return;
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
    // Return the generator so its `finally {}` runs and releases resources.
    async cancel(reason) {
      cancelled = true;
      await asyncGenerator.return?.(reason);
    },
  });
}
