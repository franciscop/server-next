import StatusError from "./StatusError";
import type { Context } from "..";

export default function validate(ctx: Context, schema: any): void {
  if (!schema || typeof schema !== "object") return;

  let base: string;
  try {
    if (typeof schema?.body === "function") {
      base = "body";
      schema.body(ctx.body || {});
    }
    if (typeof schema?.body?.parse === "function") {
      base = "body";
      schema.body.parse(ctx.body || {});
    }
    if (typeof schema?.query === "function") {
      base = "query";
      schema.query(ctx.url.query || {});
    }
    if (typeof schema?.query?.parse === "function") {
      base = "query";
      schema.query.parse(ctx.url.query || {});
    }
  } catch (error: any) {
    if (error.name === "ZodError" || error.constructor.name === "ZodError") {
      const message = error.issues
        .map(
          ({ path, message }: any) => `[${base}.${path.join(".")}]: ${message}`,
        )
        .sort()
        .join("\n");
      throw new StatusError(message, 422);
    }
    throw error;
  }
}
