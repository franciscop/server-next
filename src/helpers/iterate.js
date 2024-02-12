export default async function iterate(stream, cb) {
  const reader = stream.getReader();
  while (true) {
    const chunk = await reader.read();
    if (chunk.done || !chunk.value) return;
    cb(chunk.value);
  }
}
