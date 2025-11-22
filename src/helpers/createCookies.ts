interface CookieValue {
  value: string;
  path?: string;
  expires?: string;
}

// Takes an object and returns a string with the proper cookie values
export default function createCookies(
  cookies: Record<string, string | CookieValue | null>,
): string[] {
  if (!cookies || !Object.keys(cookies).length) return [];
  return Object.entries(cookies).map(([key, val]) => {
    if (!val) {
      val = { value: "", expires: new Date(0).toUTCString() };
    }
    if (typeof val === "string") {
      val = { value: val };
    }
    const { value, path, expires } = val;
    const pathPart = `;Path=${path || "/"}`;
    const expiresPart = expires ? `;Expires=${expires}` : "";
    return `${key}=${value || ""}${pathPart}${expiresPart}`;
  });
}
