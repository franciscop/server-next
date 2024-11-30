export default function cors(configOrigin, origin = "") {
  // A star should always return a star
  if (configOrigin === "*") return "*";

  origin = origin.toLowerCase();

  // No origin
  if (!origin) {
    console.warn("CORS: Missing Origin header");
    return null;
  }

  // Coming from localhost
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return origin;
  }

  if (configOrigin.toLowerCase().split(/\,\s/g).includes(origin)) {
    return origin;
  }

  console.warn(`CORS: Origin "${origin}" is not allowed`);
  return null;
}
