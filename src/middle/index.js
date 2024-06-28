import argon2 from "argon2";

import { createId } from "../helpers";
import { status } from "../reply";

export default function middle(ctx) {
  // if (ctx.auth?.type?.includes("email")) {
  //   ctx.app.post("/register", async (ctx) => {
  //     const { email, password, ...data } = ctx.body;
  //     if (!email || !/@/.test(email)) throw new Error("Email needed");
  //     if (!password || password.length < 8) throw new Error("Password needed");
  //     const id = createId();
  //     const time = new Date().toISOString();
  //     const pass = await argon2.hash(password);
  //     await ctx.auth.store.set(email, { id, email, password: pass, ...data });
  //     const token = await ctx.options.session.store.add({ id, email, time });
  //     return status(201).send({ id, token, email, ...data });
  //   });
  //
  //   ctx.app.post("/login", async (ctx) => {
  //     const { email, password } = ctx.body;
  //     if (!email || !/@/.test(email)) throw new Error("Email needed");
  //     if (!password || password.length < 8) throw new Error("Password needed");
  //     const time = new Date().toISOString();
  //     const user = await ctx.auth.store.get(email);
  //     if (!user) {
  //       return status(400).send("Invalid email");
  //     }
  //     if (!(await argon2.verify(user.password, password))) {
  //       return status(400).send("Invalid password");
  //     }
  //     const token = await ctx.options.session.store.add({
  //       id: user.id,
  //       email,
  //       time,
  //     });
  //     return { id: user.id, token, email };
  //   });
  // }
}
