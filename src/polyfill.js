// out = new Response(out, { headers: { "content-type": type } });
if (typeof Response === "undefined") {
  globalThis.Response = function Response(body, other = {}) {
    return { body, ...other };
  };
}

// Polyfill Netlify's environment variables
if (typeof Netlify !== "undefined") {
  if (!globalThis.process) {
    globalThis.process = {};
  }
  if (!globalThis.process.env) {
    globalThis.process.env = {};
  }
  Object.assign(global.process.env, Netlify.env.toObject());
}
