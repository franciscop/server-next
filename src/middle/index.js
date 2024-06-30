import assets from "./assets.js";
import authMiddle from "./auth.js";

export default function middle(ctx) {
  // Serve assets
  if (ctx.options.public) {
    // We need these before other endpoints
    ctx.app.handlers.get.unshift(["*", "*", assets]);
  }

  if (ctx.options.auth?.providers?.includes("email")) {
    // TODO: UGH we also need these before other endpoints, but now they are
    // being added to the end
    ctx.app.post("/auth/register/email", authMiddle.registerEmail);
    ctx.app.post("/auth/logout", authMiddle.logout);
    ctx.app.post("/auth/login/email", authMiddle.loginEmail);
  }
}
