import ValidationError from "../errors/ValidationError";
import type { Context, RouteOptions, StandardSchemaV1 } from "../types";

// Runs a Standard Schema (https://standardschema.dev): returns the validated
// value or throws a ValidationError (issues go to onError, never the client)
async function run<T>(
  schema: StandardSchemaV1<any, T>,
  value: unknown,
  source: "body" | "query" | "params" | "response",
): Promise<T> {
  const result = await schema["~standard"].validate(value);
  if (result.issues) throw new ValidationError(source, result.issues);
  return (result as { value: T }).value;
}

// Replaces each request part with its validated output; query and params are
// mutated in place since ctx.url exposes them through getters
export async function validateRequest(
  ctx: Context,
  options: RouteOptions,
): Promise<void> {
  if (options.body) {
    ctx.body = await run(options.body, ctx.body ?? {}, "body");
  }
  if (options.query) {
    const query = await run(options.query, ctx.url.query || {}, "query");
    replace(ctx.url.query, query);
  }
  if (options.params) {
    const params = await run(options.params, ctx.url.params || {}, "params");
    replace(ctx.url.params, params);
  }
}

// Validates plain object/array returns only; a status, Response, file or
// stream isn't the resource the schema describes
export async function validateResponse(
  out: unknown,
  options: RouteOptions,
): Promise<unknown> {
  if (!options.response) return out;
  if (out?.constructor !== Object && !Array.isArray(out)) return out;
  return await run(options.response, out, "response");
}

// Swap an object's contents for the validated version without changing its
// identity (the getters keep returning the same object)
function replace(target: Record<string, any>, values: Record<string, any>) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, values);
}
