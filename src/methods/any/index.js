import { params, reduce } from "../../helpers/index.js";

export default (...cbs) => async ctx => {
  const [path, ...all] = typeof cbs[0] === "string" ? cbs : [ctx.path, ...cbs];

  ctx.params = params(path, ctx.path);
  if (!ctx.params) return;
  return reduce(...all)(ctx);
};
