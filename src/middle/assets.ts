import { type } from "../reply";
import type { Context } from "../types";

export default async function assets(ctx: Context) {
  if (!ctx.options.public) return;
  if (ctx.method !== "get") return;
  // The homepage _cannot_ be a file by definition. We could consider sending
  // `index.html`, but that's easy with `.get('/', () => file('index.html'))
  if (ctx.url.pathname === "/") return;
  try {
    const asset = ctx.options.public.file(ctx.url.pathname);
    if (!(await asset.exists())) return;
    return type(ctx.url.pathname.split(".").pop()).send(asset.stream());
  } catch {
    // NO-OP; if there's no file, keep going the normal flow
  }
}
