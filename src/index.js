import { reduce, reply } from "./helpers/index.js";
import middle from "./middleware/index.js";

import { node } from "./engine/index.js";

// Export all of the HTTP verbs as named constants
export * from "./methods/index.js";

// Some other, non-HTTP methods but routers nonetheless
// export { default as socket } from "./socket";
// export { default as domain } from "./domain";

// The main function that runs the whole thing
export default async (options = {}, ...middleware) => {
  if (typeof options === "function") {
    middleware.unshift(options);
    options = {};
  }

  const engine = options.engine || node;

  // Generate a single callback with all the middleware
  const handler = reduce(middle, middleware);

  return engine((ctx) => reply(handler, ctx), options);
};
