export default function parseCookies(
  cookies?: string | string[],
): Record<string, string> {
  if (!cookies) return {};
  // If it's an array, just use the first cookie header
  const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
  if (!cookieStr) return {};
  return Object.fromEntries(
    cookieStr.split(/;\s*/).map((part) => {
      const [key, ...rest] = part.split("=");
      const value = rest.join("=");
      // A cookie set elsewhere may not be encoded (a bare '%' throws), so fall
      // back to the raw value instead of failing the whole request
      try {
        return [key, decodeURIComponent(value)];
      } catch {
        return [key, value];
      }
    }),
  );
}
