import kv from "polystore";

import { file, router, status } from "../src/index.js";

const store = kv(new URL(`file://${process.cwd()}/demo/auth.json`));

const login = async (ctx) => {
  if (ctx.platform.runtime !== "bun") {
    return status(404).json({ error: "Platform not supported" });
  }

  const { password: pwd } = await import("bun");

  const { email, password } = ctx.body;
  const user = await store.get(email);
  if (!user) return status(404).json({ error: "Not found" });

  if (!(await pwd.verify(password, user.password))) {
    return status(400).json({ error: "Invalid password" });
  }

  return { email };
};

const register = async (ctx) => {
  if (ctx.platform.runtime !== "bun") {
    return status(404).json({ error: "Platform not supported" });
  }

  const { password: pwd } = await import("bun");

  const { email, password } = ctx.body;
  await store.set(email, {
    email,
    password: await pwd.hash({ email, password }),
  });
  return status(201).json({ email });
};

//
const doNuff = (ctx) => {};

export default router()
  .get("/login", doNuff, () => file("./demo/views/login.html"))
  .post("/login", doNuff, login)
  .get("/register", () => file("./demo/views/register.html"))
  .post("/register", register);
