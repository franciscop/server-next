// Based on https://expressjs.com/en/resources/middleware/cors.html#configuration-options
export default function cors(configOrigin, origin = "") {
  origin = origin.toLowerCase();

  // When it's true, reflect the origin
  if (configOrigin === true) return origin || null;

  // A star should always return a star
  if (configOrigin === "*") return "*";

  // No origin, it's okay since that means we don't need CORS
  if (!origin) return null;

  // Coming from localhost
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return origin;
  }

  if (
    configOrigin
      .toLowerCase()
      .split(/\s*,\s*/g)
      .includes(origin)
  ) {
    return origin;
  }

  console.warn(
    `CORS: Origin "${origin}" not allowed. Allowed origins: ${configOrigin}`,
  );
  return null;
}
