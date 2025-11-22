export default async function iterate(
  stream: ReadableStream,
  cb: (chunk: any) => void,
): Promise<void> {
  const reader = stream.getReader();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done || !chunk.value) return;
    cb(chunk.value);
  }
}
