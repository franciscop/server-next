// Byte sizes in both directions: '10mb' → number for the limits, and
// number → '1.5kb' for the log line and the 413 message, so the string a user
// configures and the string they read back can never drift apart.
const UNITS = ["b", "kb", "mb", "gb", "tb"];

export function parseBytes(value: number | string): number {
  if (typeof value === "number") return value;
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
    tb: 1024 ** 4,
  };
  const match = value.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)$/);
  if (!match) throw new Error(`Invalid size: "${value}"`);
  return parseFloat(match[1]) * (units[match[2]] ?? 1);
}

// 0 → "0b", 5 → "5b", 1024 → "1kb", 1536 → "1.5kb"
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0b";
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** i;
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${UNITS[i]}`;
}
