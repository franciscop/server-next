// Type-level mirror of the runtime matching below: infers the params object
// (names, `(type)` annotations, `?` optionals) from a route path literal.
export type ExtractPathParams<Path extends string> =
  Path extends `${string}:${infer Param}(${infer Type})?/${infer Rest}`
    ? `${Param}:${Type}?` | ExtractPathParams<`/${Rest}`>
    : Path extends `${string}:${infer Param}(${infer Type})?`
      ? `${Param}:${Type}?`
      : Path extends `${string}:${infer Param}(${infer Type})/${infer Rest}`
        ? `${Param}:${Type}` | ExtractPathParams<`/${Rest}`>
        : Path extends `${string}:${infer Param}(${infer Type})`
          ? `${Param}:${Type}`
          : Path extends `${string}:${infer Param}?/${infer Rest}`
            ? `${Param}?` | ExtractPathParams<`/${Rest}`>
            : Path extends `${string}:${infer Param}?`
              ? `${Param}?`
              : Path extends `${string}:${infer Param}/${infer Rest}`
                ? Param | ExtractPathParams<`/${Rest}`>
                : Path extends `${string}:${infer Param}`
                  ? Param
                  : never;

export type ParamTypeMap = {
  string: string;
  number: number;
  date: Date;
};

export type InferParamType<T extends string> = T extends keyof ParamTypeMap
  ? ParamTypeMap[T]
  : string;

export type ParamsToObject<Params extends string> = {
  [K in Params as K extends `${infer Key}:${infer _Type}?`
    ? Key
    : K extends `${infer Key}:${infer _Type}`
      ? Key
      : K extends `${infer Key}?`
        ? Key
        : K]: K extends `${infer _Key}:${infer Type}?`
    ? InferParamType<Type> | undefined
    : K extends `${infer _Key}:${infer Type}`
      ? InferParamType<Type>
      : K extends `${infer _Key}?`
        ? string | undefined
        : string;
};

export type PathToParams<Path extends string> = ParamsToObject<
  ExtractPathParams<Path>
>;

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
