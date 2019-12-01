import { reduce, reply } from "./helpers/index.js";
import middle from "./middleware/index.js";

import getEngine from "./engine/index.js";

// Export all of the HTTP verbs as named constants
export * from "./methods/index.js";

// Some other, non-HTTP methods but routers nonetheless
// export { default as socket } from "./socket";
// export { default as domain } from "./domain";

// The main function that runs the whole thing
export default async (options = {}, ...middleware) => {
  if (typeof options === "function") {
    middleware.unshift(options);
    options = { port: 3000 };
  }
  options.engine = options.engine || getEngine();

  const addOptions = ctx => {
    ctx.options = options;
  };

  // Generate a single callback with all the middleware
  const callback = reduce(addOptions, middle, middleware);

  return options.engine(ctx => reply(callback, ctx), options);
};
