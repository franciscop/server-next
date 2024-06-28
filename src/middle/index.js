import argon2 from "argon2";

import { createId } from "../helpers/index.js";
import { status } from "../reply.js";

export default function middle(ctx) {
  if (!ctx.auth) return;
  if (ctx.auth?.providers?.includes("email")) {
    ctx.app.post("/auth/register/email", async (ctx) => {
      const { email, password, ...data } = ctx.body;
      if (!email || !/@/.test(email)) throw new Error("Email needed");
      if (!password || password.length < 8) throw new Error("Password needed");
      const id = createId();
      const time = new Date().toISOString();
      const pass = await argon2.hash(password);
      await ctx.auth.store.set(email, { id, email, password: pass, ...data });

      // TYPE GOES HERE
      const token = await ctx.options.session.store.add({ id, email, time });
      return status(201).json({ id, token, email, ...data });
    });

    ctx.app.post("/auth/logout", async (ctx) => {
      if (ctx.auth.id) {
        await ctx.options.session.store.del(ctx.auth.id);
      }
      return status(200).send();
    });

    ctx.app.post("/auth/login/email", async (ctx) => {
      const { email, password } = ctx.body;
      if (!email || !/@/.test(email)) throw new Error("Email needed");
      if (!password || password.length < 8) throw new Error("Password needed");
      const time = new Date().toISOString();
      const user = await ctx.auth.store.get(email);
      if (!user) {
        return status(400).json({ error: "Invalid email" });
      }
      if (!(await argon2.verify(user.password, password))) {
        return status(400).json({ error: "Invalid password" });
      }

      // TYPE GOES HERE
      const token = await ctx.options.session.store.add({
        id: user.id,
        email,
        time,
      });
      return { id: user.id, token, email };
    });
  }
}
