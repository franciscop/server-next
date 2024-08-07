// out = new Response(out, { headers: { "content-type": type } });
if (typeof Response === "undefined") {
  global.Response = function Response(body, other = {}) {
    return { body, ...other };
  };
}

// Polyfill Netlify's environment variables
globalThis.env = {};
if (typeof Netlify !== "undefined") {
  Object.assign(env, Netlify.env.toObject());
}
if (typeof process !== "undefined") {
  Object.assign(env, process.env);
}
if (typeof import.meta.env !== "undefined") {
  Object.assign(env, import.meta.env);
}
