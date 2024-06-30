import { type } from "../reply.js";

export default async function assets(ctx) {
  try {
    // TODO: streaming
    const asset = await ctx.options.public.read(ctx.url.pathname);
    if (!asset) return;
    return type(ctx.url.pathname.split(".").pop()).send(asset);
  } catch (error) {
    // NO-OP; if there's no file, keep going the normal flow
  }
}
