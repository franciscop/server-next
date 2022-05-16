import { reduce, reply } from "./helpers/index.js";
import middle from "./middleware/index.js";

import { node } from "./engine/index.js";

// Export all of the HTTP verbs as named constants
export * from "./methods/index.js";

// Some other, non-HTTP methods but routers nonetheless
// export { default as socket } from "./socket";
// export { default as domain } from "./domain";

const clearOptions = (options) => ({
  ...options,
  env: options.env || "development",
  engine: options.engine || node,
});

const colors = {
  yellow: (str) => `\x1b[33m${str}\x1b[0m`,
  cyan: (str) => `\x1b[36m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  bright: (str) => `\x1b[1m${str}\x1b[0m`,
};

// The main function that runs the whole thing
export default async (options = {}, ...middleware) => {
  if (typeof options === "function") {
    middleware.unshift(options);
    options = {};
  }

  options = clearOptions(options);

  // Generate a single callback with all the middleware
  const handler = reduce(middle, middleware);

  const instance = await options.engine((ctx) => reply(handler, ctx), options);

  if (options.env === "development") {
    console.log(
      `Running in ${colors.yellow(options.env)} mode:
• Port: ${colors.cyan(options.port)}
• URL: ${colors.cyan(`http://localhost:${options.port}/\x1b[0m`)}
• Routes: ${colors.cyan(`${middleware.length} functions`)}
`
    );
  }

  return instance;
};
