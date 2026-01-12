export default function pathPattern(
  pattern: string,
  path: string,
): Record<string, any> | null {
  if (pattern === "*" && path === "/") return {};

  pattern = `/${pattern.replace(/^\//, "")}`;
  pattern = pattern.replace(/\/$/, "") || "/";
  path = path.replace(/\/$/, "") || "/";

  if (pattern === path) return {};

  const params: Record<string, any> = {};
  const pathParts = path
    .split("/")
    .slice(1)
    .map((u) => decodeURIComponent(u));
  const pattParts = pattern.split("/").slice(1);

  let allSame = true;

  for (let i = 0; i < Math.max(pathParts.length, pattParts.length); i++) {
    const patt = pattParts[i] || "";
    const part = pathParts[i] || "";
    const last = pattParts[pattParts.length - 1];
    const key = patt
      .replace(/^:/, "")
      .replace(/\?$/, "")
      .replace(/\(\w*\)/, "");

    if (patt === part) continue;
    if (patt.endsWith("?") && !part) continue;

    if (patt.startsWith(":")) {
      params[key] = part;

      if (/\(\w*\)/.test(patt)) {
        if (patt.includes("(number)")) {
          const value = Number(part);
          params[key] = Number.isNaN(value) ? undefined : value;
        }
        if (patt.includes("(date)")) {
          const value = new Date(part);
          params[key] = Number.isNaN(value.getTime()) ? undefined : value;
        }
      }
      continue;
    }

    if ((!patt && last === "*" && part) || (patt === "*" && part)) {
      params["*"] = params["*"] || [];
      params["*"].push(part);
      continue;
    }

    allSame = false;
  }

  if (allSame) return params;

  return null;
}
