import * as fsp from "node:fs/promises";
import type { Context } from "../types";

const getConfig = (options: any = {}): any => {
  const config = { ...options };
  if (config.tags) {
    if (typeof config.tags === "string") {
      config.tags = config.tags.split(/\s*,\s*/g);
    }
    if (!Array.isArray(config.tags)) {
      throw new Error("invalid tags");
    }
    config.tags = config.tags.map((t: string) => t.trim());
  }
  return config;
};

// A JSON Schema draft marker doesn't belong inside an OpenAPI document
const clean = ({ $schema, ...schema }: any) => schema;

// Any Standard Schema becomes JSON Schema through its own vendor: arktype
// exposes it on the instance, zod and valibot on their modules, imported
// dynamically so the framework stays dependency-free and reuses the library
// the app built the schema with. Valibot needs its `@valibot/to-json-schema`
// companion installed. Anything else (or a schema the vendor can't express)
// falls back to the zod-internals reader below, then to a plain string.
async function toJsonSchema(schema: any): Promise<any> {
  try {
    if (typeof schema?.toJsonSchema === "function") {
      return clean(schema.toJsonSchema());
    }
    const vendor = schema?.["~standard"]?.vendor;
    if (vendor === "zod") {
      const mod: any = await import("zod");
      return clean((mod.toJSONSchema ?? mod.z.toJSONSchema)(schema));
    }
    if (vendor === "valibot") {
      const mod: any = await import("@valibot/to-json-schema");
      return clean(mod.toJsonSchema(schema));
    }
  } catch {
    // fall through to the introspection fallback
  }
  return zodToSchema(schema);
}

// Convert Zod to OpenAPI requestBody without external libraries
function zodToSchema(schema: any): any {
  const type = schema?.def?.type || "string";

  if (type === "object") {
    const shape = schema.def.shape;
    const properties: Record<string, any> = {};
    const req: string[] = [];

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

const getTag = (name: string, fn: () => void): string => {
  const found = fn
    .toString()
    .split("\n")
    .filter((l) => /\s+\/\/\s/.test(l))
    .map((l) => l.trim().replace("// ", ""))
    .find((l) => l.startsWith(name));
  if (!found) return "";
  return found.replace(name, "").trim();
};

const getDescription = (fn: () => string): string =>
  getTag("@description", fn) || "";
const getReturn = (fn: () => string): string => getTag("@returns", fn) || "OK";

const generateOpenApiPaths = async (
  handlers: Record<string, any[]>,
  specPath: string,
): Promise<Record<string, any>> => {
  const paths: Record<string, any> = {};

  for (const [method, routes] of Object.entries(handlers)) {
    for (const route of routes) {
      const path = route.path;
      // The handler is the LAST function: the chain starts with the global
      // middleware (timer, assets, ...), whose names must not become docs
      const fn = [...route.fns].reverse().find((p: any) => typeof p === "function");
      // Validation schemas live in the route options; `schema` is spec metadata
      const meta = route.options ?? {};
      const config = getConfig(route.options?.schema);

      // The spec doesn't document itself
      if (typeof path !== "string" || path === "*" || path === specPath || !fn) {
        continue;
      }

      // Normalize path (convert ":id" to "{id}" for OpenAPI)
      const normalizedPath = path
        .replace(/\(\w+\)/gi, "")
        .replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

      if (!paths[normalizedPath]) {
        paths[normalizedPath] = {};
      }

      const getTitle = (fn: () => string): string | null => {
        if (!fn.name) return null;
        // Well, we shouldn't really rely on these, e.g. automatic names from export default
        const wrongNames = ["default"];
        if (wrongNames.includes(fn.name)) return null;
        if (fn.name.length <= 3) return null;
        if (fn.name.includes("_")) return fn.name.replace(/_/g, " ");
        const name = fn.name
          .split(/(?=[A-Z])/)
          .join(" ")
          .toLowerCase();
        return name[0].toUpperCase() + name.slice(1);
      };

      let requestBody:
        | { content: { "application/json": { schema: any } } }
        | undefined;
      if (meta?.body) {
        const schema = await toJsonSchema(meta.body);
        requestBody = { content: { "application/json": { schema } } };
      }

      let responses:
        | {
            200: {
              description: string;
              content: { "application/json": { schema: any } };
            };
          }
        | undefined;
      if (meta?.response) {
        const schema = await toJsonSchema(meta.response);
        const description = getReturn(fn);
        responses = {
          200: { description, content: { "application/json": { schema } } },
        };
      }

      const parameters: any[] = [];

      // Extract the query parameters
      const matched = Array.from(path.matchAll(/:[\w()]+/gi));
      matched.forEach((match: RegExpMatchArray) => {
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

      // A `query` schema's properties become the query parameters
      if (meta?.query) {
        const schema = await toJsonSchema(meta.query);
        for (const [name, prop] of Object.entries(schema.properties ?? {})) {
          parameters.push({
            name,
            in: "query",
            required: schema.required?.includes(name) ?? false,
            schema: prop,
          });
        }
      }

      paths[normalizedPath][method] = {
        tags: config.tags,
        summary:
          config.title ||
          getTag("@title", fn) ||
          `${method.toUpperCase()} ${normalizedPath}`,
        description: config.description || getTitle(fn) || getDescription(fn),
        requestBody,
        parameters,
        responses,
      };
    }
  }

  return paths;
};

// The spec itself, as JSON. There's no built-in viewer: every docs UI is a
// static shell pointing at this route, so it stays a copy-paste in the docs.
export default async (ctx: Context): Promise<Record<string, any>> => {
  const pkg = await pkgProm;
  // The root option wins; the app's own package.json fills the rest
  const { title, description, version } = ctx.options.openapi ?? {};
  const domain = (pkg as any).homepage || ctx.url.origin;
  return {
    openapi: "3.0.0",
    info: {
      title: title || (pkg as any).name || "API Documentation",
      version: version || (pkg as any).version || "1.0.0",
      description: description ?? ((pkg as any).description || ""),
    },
    servers: domain ? [{ url: domain }] : [],
    paths: await generateOpenApiPaths(
      (ctx as any).app.handlers,
      ctx.options.openapi?.path ?? "",
    ),
  };
};
