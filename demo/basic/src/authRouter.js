import { file, router } from "../../../src/index.js";

export default router()
  .get("/login", () => file("./views/login.html"))
  .get("/register", () => file("./views/register.html"));
