export default function parseCookies(cookies) {
  if (!cookies) return {};
  return Object.fromEntries(
    cookies.split(/;\s*/).map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, decodeURIComponent(rest.join("="))];
    })
  );
}
