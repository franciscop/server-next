// What a file actually is, from its first bytes. A `Content-Type` header (or a
// filename) is the client's claim; this is the only part we can check. Used to
// name the stored file and to run the `fileType` whitelist against something
// the client cannot simply assert.
//
// Only formats with a real signature are here. Text ones (SVG, HTML, CSV, XML,
// JSON) have none, so they return null and the caller falls back to the claim.

type Signature = {
  type: string;
  // Byte values to match, `null` for a byte that may be anything
  magic: (number | null)[];
  offset?: number;
};

const ascii = (text: string): number[] =>
  [...text].map((char) => char.charCodeAt(0));

// Order matters: a longer, more specific signature must come before a shorter
// one that prefixes it (RIFF containers, and the two GIF versions).
const SIGNATURES: Signature[] = [
  { type: "image/png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  { type: "image/gif", magic: ascii("GIF87a") },
  { type: "image/gif", magic: ascii("GIF89a") },
  // RIFF containers: the format is at byte 8, so the whole thing is one match
  { type: "image/webp", magic: [...ascii("RIFF"), null, null, null, null, ...ascii("WEBP")] },
  { type: "audio/wav", magic: [...ascii("RIFF"), null, null, null, null, ...ascii("WAVE")] },
  { type: "image/bmp", magic: ascii("BM") },
  { type: "image/tiff", magic: [0x49, 0x49, 0x2a, 0x00] },
  { type: "image/tiff", magic: [0x4d, 0x4d, 0x00, 0x2a] },
  { type: "image/vnd.microsoft.icon", magic: [0x00, 0x00, 0x01, 0x00] },
  { type: "image/avif", magic: ascii("ftypavif"), offset: 4 },
  { type: "image/heic", magic: ascii("ftypheic"), offset: 4 },
  { type: "application/pdf", magic: ascii("%PDF-") },
  { type: "application/zip", magic: [0x50, 0x4b, 0x03, 0x04] },
  { type: "application/gzip", magic: [0x1f, 0x8b] },
  { type: "video/mp4", magic: ascii("ftyp"), offset: 4 },
  { type: "video/webm", magic: [0x1a, 0x45, 0xdf, 0xa3] },
  { type: "audio/ogg", magic: ascii("OggS") },
  { type: "audio/mpeg", magic: ascii("ID3") },
];

// How many bytes are needed before any of the above can be decided
export const HEAD_SIZE = 32;

const matches = (head: Uint8Array, { magic, offset = 0 }: Signature): boolean => {
  if (head.length < offset + magic.length) return false;
  return magic.every((byte, i) => byte === null || head[offset + i] === byte);
};

export default function sniff(head: Uint8Array): string | null {
  for (const signature of SIGNATURES) {
    if (matches(head, signature)) return signature.type;
  }
  return null;
}

// Whether a claimed type is one the signatures above can confirm. A claim we
// could have verified but did not match is a lie; one we cannot verify at all
// (every text format) has to be taken at face value.
const KNOWN = new Set(SIGNATURES.map((s) => s.type));

export const isSniffable = (type: string): boolean =>
  KNOWN.has((type || "").split(";")[0].trim().toLowerCase());

// Some formats are a container with something specific inside: every Office
// and OpenDocument file is a ZIP, so the bytes only ever say "zip" while the
// client's own claim carries the part that matters. When the claim is a known
// tenant of the container we keep it; anything else still loses to the bytes.
const CONTAINED: Record<string, (type: string) => boolean> = {
  "application/zip": (type) =>
    type.endsWith("+zip") ||
    type.startsWith("application/vnd.openxmlformats-officedocument.") ||
    type.startsWith("application/vnd.oasis.opendocument.") ||
    type === "application/java-archive" ||
    type === "application/vnd.android.package-archive",
};

// What to store a file as, given what the bytes say and what the client claimed
export function resolveType(sniffed: string | null, declared: string): string {
  if (!sniffed) return declared;
  const inside = CONTAINED[sniffed];
  const claim = (declared || "").split(";")[0].trim().toLowerCase();
  return inside?.(claim) ? claim : sniffed;
}
