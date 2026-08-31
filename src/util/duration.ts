// Human durations ('30d', '12 hours', '1y') into milliseconds. Shared by
// cookie expiry, Cache-Control max-age and credential lifetimes, so every
// `expires`-style option accepts the same spellings.
const times = /(-?(?:\d+\.?\d*|\d*\.?\d+)(?:e[-+]?\d+)?)\s*([\p{L}]*)/iu;

parse.millisecond = parse.ms = 0.001;
parse.second = parse.sec = parse.s = parse[""] = 1;
parse.minute = parse.min = parse.m = parse.s * 60;
parse.hour = parse.hr = parse.h = parse.m * 60;
parse.day = parse.d = parse.h * 24;
parse.week = parse.wk = parse.w = parse.d * 7;
parse.year = parse.yr = parse.y = parse.d * 365.25;
parse.month = parse.b = parse.y / 12;

// Returns the time in milliseconds
export function parse(str: string) {
  if (str === null || str === undefined) return null;
  if (typeof str === "number") return str;
  if (typeof str !== "string") {
    throw new Error(`Not a string: ${str} (${typeof str})`);
  }
  // ignore commas/placeholders
  str = str.toLowerCase().replace(/[,_]/g, "");
  const [_, value, units] = times.exec(str) || [];
  if (!units) return null;
  const unitValue = parse[units] || parse[units.replace(/s$/, "")];
  if (!unitValue) return null;
  const result = unitValue * parseFloat(value);
  return Math.abs(Math.round(result * 1000));
}
