import sniff from "./sniff";

// Bytes tell the truth; a Content-Type header is only a claim. These are the
// real signatures, so a file that lies about itself is still recognised.
const bytes = (...parts: (number[] | string)[]): Uint8Array => {
  const out: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") {
      for (const c of part) out.push(c.charCodeAt(0));
    } else out.push(...part);
  }
  return new Uint8Array(out);
};

const pad = (head: Uint8Array, size = 64): Uint8Array => {
  const out = new Uint8Array(size);
  out.set(head);
  return out;
};

describe("sniff", () => {
  const cases: [string, Uint8Array, string][] = [
    ["png", bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"],
    ["jpeg", bytes([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"],
    ["gif87", bytes("GIF87a"), "image/gif"],
    ["gif89", bytes("GIF89a"), "image/gif"],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "WEBP"), "image/webp"],
    ["bmp", bytes("BM"), "image/bmp"],
    ["tiff LE", bytes([0x49, 0x49, 0x2a, 0x00]), "image/tiff"],
    ["tiff BE", bytes([0x4d, 0x4d, 0x00, 0x2a]), "image/tiff"],
    ["ico", bytes([0x00, 0x00, 0x01, 0x00]), "image/vnd.microsoft.icon"],
    ["pdf", bytes("%PDF-"), "application/pdf"],
    ["zip", bytes([0x50, 0x4b, 0x03, 0x04]), "application/zip"],
    ["gzip", bytes([0x1f, 0x8b])
, "application/gzip"],
    ["mp4", bytes([0, 0, 0, 0x18], "ftypmp42"), "video/mp4"],
    ["webm", bytes([0x1a, 0x45, 0xdf, 0xa3]), "video/webm"],
    ["ogg", bytes("OggS"), "audio/ogg"],
    ["wav", bytes("RIFF", [0, 0, 0, 0], "WAVE"), "audio/wav"],
    ["mp3 id3", bytes("ID3"), "audio/mpeg"],
  ];

  for (const [label, head, type] of cases) {
    it(`recognises ${label}`, () => {
      expect(sniff(pad(head))).toBe(type);
    });
  }

  it("returns null for text, which has no signature", () => {
    expect(sniff(bytes("hello, world"))).toBe(null);
    expect(sniff(bytes("<svg xmlns=\"http://www.w3.org/2000/svg\">"))).toBe(null);
    expect(sniff(bytes("id,name\n1,ada\n"))).toBe(null);
  });

  it("returns null for an empty or truncated head", () => {
    expect(sniff(new Uint8Array(0))).toBe(null);
    expect(sniff(bytes([0x89, 0x50]))).toBe(null);
  });

  it("does not confuse RIFF containers", () => {
    expect(sniff(pad(bytes("RIFF", [0, 0, 0, 0], "AVI ")))).not.toBe("image/webp");
  });
});
