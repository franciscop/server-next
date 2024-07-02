import { type } from "../reply.js";

export default async function assets(ctx) {
  try {
    // TODO: streaming
    // Read it as buffer (null)
    const asset = await ctx.options.public.read(ctx.url.pathname, null);
    if (!asset) return;
    return type(ctx.url.pathname.split(".").pop()).send(asset);
  } catch (error) {
    // NO-OP; if there's no file, keep going the normal flow
  }
}
