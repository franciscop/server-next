export default function iteratorToReadable(generator: AsyncIterable<any>): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of generator) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}
