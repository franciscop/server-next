import { params, reduce } from "../../helpers/index.js";

export default (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (ctx.method !== "PUT") return;
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};
