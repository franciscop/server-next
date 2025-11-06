const localhost = /^https?:\/\/localhost(:\d+)?$/;

// Based on https://expressjs.com/en/resources/middleware/cors.html#configuration-options
export default function cors(config: boolean | string | string[], origin: string = ""): string | null {
  origin = origin.toLowerCase();

  // When it's true, reflect the origin
  if (config === true) return origin || null;

  // A star should always return a star
  if (config === "*") return "*";

  // No origin, it's okay since that means we don't need CORS
  if (!origin) return null;

  // Coming from localhost
  if (localhost.test(origin)) return origin;

  const arr = Array.isArray(config) ? config : config.split(/\s*,\s*/g);
  if (arr.includes(origin)) return origin;

  console.warn(`CORS: Origin "${origin}" not allowed. Allowed "${config}"`);
  return null;
}
