type ExtractPathParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractPathParams<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
    ? Param
    : never;

type ParamsToObject<Params extends string> = {
  [K in Params as K extends `${infer Key}?`
    ? Key
    : K]: K extends `${infer Key}?` ? string | undefined : string;
};

type PathToParams<Path extends string> = ParamsToObject<
  ExtractPathParams<Path>
>;

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

function getParams<Pattern extends string>(
  pattern: Pattern,
  path: string
): Expand<PathToParams<Pattern>> {
  const result: Record<string, string | undefined> = {};

  const patternParts = pattern.split("/");
  const pathParts = path.split("/");

  patternParts.forEach((part, i) => {
    if (part.startsWith(":")) {
      const key = part.endsWith("?") ? part.slice(1, -1) : part.slice(1);
      result[key] = pathParts[i] || undefined;
    }
  });

  return result as Expand<PathToParams<Pattern>>;
}

type Test = ExtractPathParams<"/users/:id/posts/:postId?">;
type Test2 = ParamsToObject<"id" | "postId?">;

const params = getParams("/users/:id/posts/:postId?", "/users/25/posts/3");
console.log(params);

const params2 = getParams("/users/:id?", "/users/25");
