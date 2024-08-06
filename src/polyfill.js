// out = new Response(out, { headers: { "content-type": type } });
if (typeof Response === "undefined") {
  global.Response = function Response(body, other = {}) {
    return { body, ...other };
  };
}

// Polyfill Netlify's environment variables
if (typeof Netlify !== "undefined") {
  if (!global.process) {
    global.process = {};
  }
  if (!global.process.env) {
    global.process.env = {};
  }
  Object.assign(global.process.env, Netlify.env.toObject());
}
