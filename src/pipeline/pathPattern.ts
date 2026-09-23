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

// One segment of a route pattern, parsed from its text once
type Segment = {
  text: string;
  // The param name, without its `:`, `?` or `(type)`
  key: string;
  param: boolean;
  optional: boolean;
  type?: string;
};

type Compiled = { path: string; segments: Segment[]; wildcardTail: boolean };

// Route patterns come from code, so there are only as many as there are
// routes; each is parsed the first time it is matched and reused after that.
const compiled = new Map<string, Compiled>();

function compile(pattern: string): Compiled {
  const cached = compiled.get(pattern);
  if (cached) return cached;
  const path = `/${pattern.replace(/^\//, "")}`.replace(/\/$/, "") || "/";
  const segments = path
    .split("/")
    .slice(1)
    .map((text) => ({
      text,
      key: text
        .replace(/^:/, "")
        .replace(/\?$/, "")
        .replace(/\(\w*\)/, ""),
      param: text.startsWith(":"),
      optional: text.endsWith("?"),
      type: text.match(/\((\w+)\)/)?.[1],
    }));
  const result = {
    path,
    segments,
    // `/files/*` also takes every segment past its own end
    wildcardTail: segments[segments.length - 1]?.text === "*",
  };
  compiled.set(pattern, result);
  return result;
}

export default function pathPattern(
  pattern: string,
  path: string,
  // Whether a value that fails its cast is an error. CORS preflight asks only
  // whether the shape matches, so it must not refuse a request over a value.
  cast: boolean = true,
): Record<string, any> | null {
  if (pattern === "*" && path === "/") return {};

  const { path: normalized, segments, wildcardTail } = compile(pattern);
  path = path.replace(/\/$/, "") || "/";
  if (normalized === path) return {};

  const params: Record<string, any> = {};
  const parts = path
    .split("/")
    .slice(1)
    .map((u) => decodeURIComponent(u));

  // A cast that failed, held until we know this route is the one that matched:
  // a pattern we walk past on the way to another route must not refuse it.
  let invalid: { name: string; type: string; value: string } | null = null;

  for (let i = 0; i < Math.max(parts.length, segments.length); i++) {
    const segment = segments[i];
    const text = segment?.text ?? "";
    const part = parts[i] || "";

    if (text === part) continue;
    if (segment?.optional && !part) continue;

    if (segment?.param) {
      if (!part) return null;
      params[segment.key] = part;

      // A typed parameter is cast here, and the route matched on shape alone,
      // so a value that cannot be cast is a 400 on this route rather than an
      // `undefined` the handler has to check for.
      const { type } = segment;
      if (type === "number" || type === "date") {
        const value = type === "number" ? Number(part) : new Date(part);
        const failed =
          type === "number"
            ? Number.isNaN(value)
            : Number.isNaN((value as Date).getTime());
        if (failed) {
          invalid ??= { name: segment.key, type, value: part };
          continue;
        }
        params[segment.key] = value;
      }
      continue;
    }

    if ((!text && wildcardTail && part) || (text === "*" && part)) {
      params["*"] = [...(params["*"] ?? []), part];
      continue;
    }

    // This segment cannot match, so neither can the route
    return null;
  }

  if (invalid && cast) throw ServerError.INVALID_PARAM(invalid);
  return params;
}
