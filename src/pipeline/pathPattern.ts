import ServerError from "../errors";

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
  [
    K in Params as K extends `${infer Key}:${infer _Type}?`
      ? Key
      : K extends `${infer Key}:${infer _Type}`
        ? Key
        : K extends `${infer Key}?`
          ? Key
          : K
  ]: K extends `${infer _Key}:${infer Type}?`
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
  // Whether a value that fails its cast is an error. CORS preflight asks only
  // whether the shape matches, so it must not refuse a request over a value.
  cast: boolean = true,
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
  // A cast that failed, held until we know this route is the one that matched:
  // a pattern we walk past on the way to another route must not refuse it.
  let invalid: { name: string; type: string; value: string } | null = null;

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

      // A typed parameter is cast here, and the route matched on shape alone,
      // so a value that cannot be cast is a 400 on this route rather than an
      // `undefined` the handler has to check for.
      const type = patt.match(/\((\w+)\)/)?.[1];
      if (type === "number" || type === "date") {
        const value = type === "number" ? Number(part) : new Date(part);
        const failed =
          type === "number"
            ? Number.isNaN(value)
            : Number.isNaN((value as Date).getTime());
        if (failed) {
          invalid ??= { name: key, type, value: part };
          continue;
        }
        params[key] = value;
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

  if (!allSame) return null;
  if (invalid && cast) throw ServerError.INVALID_PARAM(invalid);
  return params;
}
