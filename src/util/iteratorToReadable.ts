const enc = new TextEncoder();

// Any sync or async iterable streams its chunks as they are produced.
// Pull-based so the producer follows the consumer (backpressure), and cancel
// forwards to the iterator so a generator's `finally` releases its resources.
export default function iteratorToReadable(
  iterable: Iterable<any> | AsyncIterable<any>,
): ReadableStream {
  const iterator =
    (iterable as any)[Symbol.asyncIterator]?.() ??
    (iterable as any)[Symbol.iterator]();
  let cancelled = false;
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        // Cancelled mid-next(): controller is already closed, don't touch it.
        if (cancelled) return;
        if (done) {
          controller.close();
          return;
        }
        // Bytes pass through untouched; anything else is sent as text.
        controller.enqueue(
          value instanceof Uint8Array
            ? value
            : enc.encode(typeof value === "string" ? value : String(value)),
        );
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel(reason) {
      cancelled = true;
      await iterator.return?.(reason);
    },
  });
}
