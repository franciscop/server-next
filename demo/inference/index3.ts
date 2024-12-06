type InferType<Type extends string> = Type extends "number"
  ? number
  : Type extends "string"
    ? string
    : unknown;

type ExtractType<Param extends string> = Param extends `${string}:${infer Type}`
  ? Type
  : never;

type ParamsToObject<Params extends string> = {
  [K in Params as K extends `${infer Key}?`
    ? Key
    : K]: K extends `${infer _Key}?`
    ? InferType<ExtractType<K>>
    : InferType<ExtractType<K>>;
};

type ExtractPathParams<Path extends string> =
  Path extends `${string}{${infer Param}:${infer Type}}${infer Rest}`
    ? Param extends `${infer Key}?`
      ? { [K in Key]?: InferType<Type> } & ExtractPathParams<Rest>
      : { [K in Param]: InferType<Type> } & ExtractPathParams<Rest>
    : Path extends `${string}{${infer Param}?}${infer Rest}`
      ? { [K in Param]?: string } & ExtractPathParams<Rest>
      : {};
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

function getParams<Path extends string>(
  pattern: Path,
  path: string,
): undefined | Expand<ExtractPathParams<Path>> {
  const params: Record<string, any> = {};
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

  if (patternParts.indexOf("*") >= 0) {
    const size = patternParts.indexOf("*");
    return getParams(
      patternParts.slice(0, size).join("/") as Path,
      pathParts.slice(0, size).join("/"),
    );
  }
  let i = -1;
  for (let part of patternParts) {
    i++;
    const match = part.match(/^{(\w+)(\?)?:([\w]+)}$/);
    if (match) {
      const [, key, optional, type] = match;
      const value = pathParts[i];
      if (value !== undefined) {
        params[key] = type === "number" ? Number(value) : value;
      } else if (!optional) {
        return;
      }
    } else if (part !== pathParts[i]) {
      return;
    }
  }

  // Check if path matches beyond the wildcard
  if (patternParts.length > pathParts.length) {
    return;
  }

  return params as Expand<ExtractPathParams<Path>>;
}

const params1 = getParams("/users/{id:string}", "/users/25");
const params2 = getParams(
  "/users/{id:string}/pages/{pageId?:number}/*",
  "/users/25/pages/35/hellothere",
);
const params3 = getParams(
  "/users/{id:string}/pages/{pageId?:number}",
  "/users/25/pages/35",
);
const params4 = getParams(
  "/users/{id:string}/pages/{pageId?:number}",
  "/users/25/pages",
);
const params5 = getParams("/users/{id:string}/*", "/users/25/pages/35");

console.log("params1", params1);
console.log("params2", params2);
console.log("params3", params3);
console.log("params4", params4);
console.log("params5", params5);

// Simple literal paths
getParams("/hello", "/hello"); // {}
getParams("/hello/world", "/hello/world"); // {}
getParams("/hello", "/hello/world"); // false
getParams("/hello/world", "/hello"); // false

// Wildcards for matching
getParams("*", "/hello/world"); // {}
getParams("/*", "/hello/world"); // {}
getParams("/hello/*", "/hello"); // {}
getParams("/hello/*", "/hello/world"); // {}
getParams("/hello/*", "/bye"); // false

// parameters
getParams("/{id}", "/42"); // { id: '42' } type: { id: string }
getParams("/users/{id}", "/users/42"); // { id: '42' } type: { id: string }

// parameter types
getParams("/users/{id:number}", "/users/42"); // { id: 42 } type: { id: number }

// optional parameters
const x10 = getParams("/users/{id?}", "/users"); // {} type: { id?: string }
const x11 = getParams("/users/{id?}", "/users/42"); // { id: '42' } type: { id?: string }

// optional typed parameter
const x20 = getParams("/users/{id?:number}", "/users"); // {} type: { id?: 42 }
const x21 = getParams("/users/{id?:number}", "/users/42"); // { id: 42 } type: { id?: 42 }
