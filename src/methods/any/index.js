import { params, parser } from "../../helpers/index.js";

export default (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right path
    if (ctx.params) {
      return handler(ctx);
    }
  };
};
