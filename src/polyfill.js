const self =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof global !== "undefined"
    ? global
    : typeof window !== "undefined"
    ? window
    : null;

// out = new Response(out, { headers: { "content-type": type } });
if (typeof Response === "undefined") {
  self.Response = function Response(body, other = {}) {
    return { body, ...other };
  };
}

// Polyfill Netlify's environment variables
if (typeof Netlify !== "undefined") {
  if (!self.process) {
    self.process = {};
  }
  if (!self.process.env) {
    self.process.env = {};
  }
  Object.assign(self.process.env, Netlify.env.toObject());
}
