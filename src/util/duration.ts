// Human durations ('30d', '12 hours', '1y') into milliseconds. Shared by
// cookie expiry, Cache-Control max-age and credential lifetimes, so every
// `expires`-style option accepts the same spellings.
const times = /(-?(?:\d+\.?\d*|\d*\.?\d+)(?:e[-+]?\d+)?)\s*([\p{L}]*)/iu;

// Seconds per unit, under every spelling accepted
const units: Record<string, number> = {};
units.millisecond = units.ms = 0.001;
units.second = units.sec = units.s = units[""] = 1;
units.minute = units.min = units.m = units.s * 60;
units.hour = units.hr = units.h = units.m * 60;
units.day = units.d = units.h * 24;
units.week = units.wk = units.w = units.d * 7;
units.year = units.yr = units.y = units.d * 365.25;
units.month = units.b = units.y / 12;

// Returns the time in milliseconds
export function parse(str: string | number | null | undefined): number | null {
  if (str === null || str === undefined) return null;
  if (typeof str === "number") return str;
  if (typeof str !== "string") {
    throw new Error(`Not a string: ${str} (${typeof str})`);
  }
  // ignore commas/placeholders
  str = str.toLowerCase().replace(/[,_]/g, "");
  const [, value, unit] = times.exec(str) || [];
  if (!unit) return null;
  const unitValue = units[unit] || units[unit.replace(/s$/, "")];
  if (!unitValue) return null;
  const result = unitValue * parseFloat(value);
  return Math.abs(Math.round(result * 1000));
}
