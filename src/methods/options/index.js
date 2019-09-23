import { reduce } from "../../helpers/index.js";

export default (...cbs) => async ctx => {
  if (ctx.method !== "OPTIONS") return;
  const [path, ...all] = typeof cbs[0] === "string" ? cbs : [ctx.path, ...cbs];
  if (path !== ctx.path) return;
  return reduce(...all)(ctx);
};
