// Parse a single HTTP `Range: bytes=start-end` header against a known total size.
// Returns an inclusive `{ start, end }` for a satisfiable range, `null` to serve
// the full body (no header, malformed, or a multi-range we don't support), or
// "unsatisfiable" for a 416. Forms handled: `bytes=0-499`, `bytes=500-` (to end),
// and `bytes=-500` (the last 500 bytes).
export default function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | "unsatisfiable" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null; // absent / malformed / multi-range -> serve full
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start: number;
  let end: number;
  if (rawStart === "") {
    // Suffix range: the last N bytes.
    const n = Number(rawEnd);
    if (n <= 0) return "unsatisfiable";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (size === 0 || start > end || start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
}
