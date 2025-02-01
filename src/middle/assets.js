import { type } from "../reply.js";

export default async function assets(ctx) {
  if (!ctx.options.public) return;
  if (ctx.method !== "get") return;
  // The homepage _cannot_ be a file by definition. We could consider sending
  // `index.html`, but that's easy with `.get('/', () => file('index.html'))
  if (ctx.url.pathname === "/") return;
  try {
    // TODO: streaming
    const asset = await ctx.options.public.read(ctx.url.pathname, null);
    if (!asset) return;
    return type(ctx.url.pathname.split(".").pop()).send(asset);
  } catch (error) {
    // NO-OP; if there's no file, keep going the normal flow
  }
}
