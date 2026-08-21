// NOT RUNNABLE YET. This is what using Better Auth would look like if `auth`
// accepted a third-party system; the framework has no such mode today. It was
// prototyped and reverted, see ideas/auth.md.
//
// import server from "../..";
// import { betterAuth } from "better-auth";
// import { memoryAdapter } from "better-auth/adapters/memory";
//
// const db = { user: [], session: [], account: [], verification: [] };
// const auth = betterAuth({
//   database: memoryAdapter(db),
//   emailAndPassword: { enabled: true },
//   baseURL: "http://localhost:3000",
//   secret: process.env.SECRET,
// });
//
// export default server({ auth })
//   .get("/", (ctx) => (ctx.user ? `Hi ${ctx.user.name}` : "Anonymous"))
//   .get("/me", (ctx) => ctx.user || 401);
