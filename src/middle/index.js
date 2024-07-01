import auth from "../auth/index.js";
import assets from "./assets.js";

export default async function middle(ctx) {
  // Serve assets
  if (ctx.options.public) {
    // We need these before other endpoints
    ctx.app.handlers.get.unshift(["*", "*", assets]);
  }

  await auth.middle(ctx);
}
