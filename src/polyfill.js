// out = new Response(out, { headers: { "content-type": type } });
if (typeof Response === "undefined") {
  global.Response = function Response(body, other = {}) {
    return { body, ...other };
  };
}

// Polyfill Netlify's environment variables
if (typeof Netlify !== "undefined" && typeof import.meta !== "undefined") {
  if (!import.meta.env) import.meta.env = {};
  Object.assign(import.meta.env, Netlify.env.toObject());
}
