import server from "../..";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

// In memory, so the demo runs as is; use one of Better Auth's database adapters
// for anything real
const db = { user: [], session: [], account: [], verification: [] };

export const auth = betterAuth({
  database: memoryAdapter(db),
  emailAndPassword: { enabled: true },
  baseURL: process.env.BASE_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "demo-only-secret-change-me-in-production",
});

// Better Auth serves its own routes under /api/auth/*, like
// POST /api/auth/sign-up/email and POST /api/auth/sign-in/email, and its
// session becomes ctx.user
export default server({ auth })
  .get("/", (ctx) => (ctx.user ? `Hi ${ctx.user.name}` : "Anonymous"))
  .get("/me", (ctx) => ctx.user || 401);
