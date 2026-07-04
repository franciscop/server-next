// A cheap, deterministic strong ETag for a chunk of bytes: FNV-1a over the
// bytes, plus their length. Non-cryptographic is fine here; it only needs to
// change when the bytes change. Zero-dep, so it works on every runtime.
export default function etag(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return `"${bytes.length.toString(16)}-${(h >>> 0).toString(16)}"`;
}
