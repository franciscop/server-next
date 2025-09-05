import fsp from "node:fs/promises";

const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const encode = (str = "") => {
  if (typeof str === "number") str = String(str);
  if (typeof str !== "string") return ""; // nullify not-strings
  return str.replace(/[&<>"]/g, (tag) => entities[tag]);
};

const getConfig = (routes) => {
  const config = routes.find(
    (r) =>
      typeof r !== "string" && typeof r !== "function" && typeof r === "object",
  );
  if (!config) return {};
  if (config.tags) {
    if (typeof config.tags === "string") {
      config.tags = config.tags.split(/\s*\,\s*/g);
    }
    if (!Array.isArray(config.tags)) {
      throw new Error("invalid tags", config.tags);
    }
    config.tags = config.tags.map((t) => t.trim());
  }
  return config;
};

// Convert Zod to OpenAPI requestBody without external libraries
function zodToSchema(schema) {
  const type = schema?.def?.type || "string";

  if (type === "object") {
    const shape = schema.def.shape;
    const properties = {};
    const req = [];

    for (const key in shape) {
      const field = shape[key];
      properties[key] = zodToSchema(field);

      if (!field.isOptional() && !field.isNullable()) {
        req.push(key);
      }
    }
    const required = req.length ? req : undefined;

    return { type, properties, required };
  }

  if (type === "array") {
    return { type, items: zodToSchema(schema.def.element) };
  }

  return { type };
}

const pkgProm = fsp
  .readFile("package.json", "utf-8")
  .then((data) => JSON.parse(data))
  .catch(() => ({}));

const getTag = (name, fn) => {
  const found = fn
    .toString()
    .split("\n")
    .filter((l) => /\s+\/\/\s/.test(l))
    .map((l) => l.trim().replace("// ", ""))
    .find((l) => l.startsWith(name));
  if (!found) return "";
  return encode(found.replace(name, "").trim());
};

const getDescription = (fn) => getTag("@description", fn) || "";
const getReturn = (fn) => getTag("@returns", fn) || "OK";

const generateOpenApiPaths = (handlers) => {
  const paths = {};

  for (const [method, routes] of Object.entries(handlers)) {
    for (const route of routes) {
      const [_, path, fn, meta] = [
        route[0],
        route[1],
        route.find((p) => typeof p === "function"),
        route.find((p) => typeof p === "object"),
      ];

      const config = getConfig(route);

      if (typeof path !== "string" || path === "*" || path === "/docs" || !fn) {
        continue;
      }

      // Normalize path (convert ":id" to "{id}" for OpenAPI)
      const normalizedPath = path
        .replaceAll(/\(\w+\)/gi, "")
        .replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

      if (!paths[normalizedPath]) {
        paths[normalizedPath] = {};
      }

      const getTitle = (fn) => {
        if (!fn.name) return null;
        // Well, we shouldn't really rely on these, e.g. automatic names from export default
        const wrongNames = ["default"];
        if (wrongNames.includes(fn.name)) return null;
        if (fn.name.length <= 3) return null;
        if (fn.name.includes("_")) return fn.name.replaceAll("_", " ");
        const name = fn.name
          .split(/(?=[A-Z])/)
          .join(" ")
          .toLowerCase();
        return name[0].toUpperCase() + name.slice(1);
      };

      let requestBody;
      if (meta?.body) {
        const schema = zodToSchema(meta.body);
        requestBody = { content: { "application/json": { schema } } };
      }

      let responses;
      if (meta?.response) {
        const schema = zodToSchema(meta.response);
        const description = getReturn(fn);
        responses = {
          200: { description, content: { "application/json": { schema } } },
        };
      }

      const parameters = [];

      // Extract the query parameters
      const matched = path.matchAll(/\:[\w\(\)]+/gi);
      matched.forEach((match) => {
        const [name, type = "string"] = match[0]
          .slice(1)
          .replace(/\)/, "")
          .split("(");
        parameters.push({
          name,
          in: "path",
          required: true,
          schema: { type },
        });
      });

      if (meta?.query) {
        Object.entries(meta.query).map(([key, value]) => ({
          name: key,
          in: "query",
          required: false,
          schema: { type: typeof value },
          example: value,
        }));
      }

      paths[normalizedPath][method] = {
        tags: config.tags,
        summary:
          config.title ||
          getTag("@title", fn) ||
          `${method.toUpperCase()} ${normalizedPath}`,
        description: getTitle(fn) || getDescription(fn),
        requestBody,
        parameters,
        responses,
      };
    }
  }

  return paths;
};

export default async (ctx) => {
  const pkg = await pkgProm;
  const domain = pkg.homepage || ctx.url.origin;
  const openApi = {
    openapi: "3.0.0",
    info: {
      title: pkg.name || "API Documentation",
      version: pkg.version || "1.0.0",
      description: pkg.description || "",
    },
    servers: domain ? [{ url: domain }] : [],
    paths: generateOpenApiPaths(ctx.app.handlers),
  };

  const configuration = ctx.options.openapi.scalar || {};

  return `
<!doctype html>
<html>
  <head>
    <title>API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
    <style>.open-api-client-button {display: none!important;}</style>
  </head>
  <body>
    <script id="api-reference" type="application/json" data-configuration="${encode(JSON.stringify(configuration))}">${JSON.stringify(openApi, null, 2)}</script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html> `;
};
