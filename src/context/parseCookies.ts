export default function parseCookies(cookies?: string): Record<string, string> {
  if (!cookies) return {};
  return Object.fromEntries(
    cookies.split(/;\s*/).map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, decodeURIComponent(rest.join("="))];
    })
  );
}
