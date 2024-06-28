import argon2 from "argon2";

import { createId } from "../helpers/index.js";
import { status, type } from "../reply.js";
import ServerError from "../ServerError.js";

export default function middle(ctx) {
  if (ctx.options.public) {
    ctx.app.handlers.get.unshift([
      "*",
      "*",
      async function publicFolder(ctx) {
        try {
          const asset = await ctx.options.public.read(ctx.url.pathname);
          if (asset) {
            return type(ctx.url.pathname.split(".").pop()).send(asset);
          }
        } catch (error) {}
      },
    ]);
  }

  if (!ctx.auth) return;
  if (ctx.auth?.providers?.includes("email")) {
    ctx.app.post("/auth/register/email", async (ctx) => {
      const { email, password, ...data } = ctx.body;
      if (!email || !/@/.test(email)) throw new Error("Email needed");
      if (!password || password.length < 8) throw new Error("Password needed");
      if (await ctx.auth.store.has(email)) {
        throw new Error("Email is already registered");
      }
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
      if (!email) throw ServerError.LOGIN_NO_EMAIL();
      if (!/@/.test(email)) throw ServerError.LOGIN_INVALID_EMAIL();
      if (!password) throw ServerError.LOGIN_NO_PASSWORD();
      if (password.length < 8) throw ServerError.LOGIN_INVALID_PASSWORD();

      const time = new Date().toISOString();
      const user = await ctx.auth.store.get(email);
      if (!user) throw ServerError.LOGIN_WRONG_EMAIL();
      const isValid = await argon2.verify(user.password, password);
      if (!isValid) throw ServerError.LOGIN_WRONG_PASSWORD();

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
