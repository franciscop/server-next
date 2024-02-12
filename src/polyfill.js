// out = new Response(out, { headers: { "content-type": type } });
if (typeof Response === "undefined") {
  global.Response = function Response(body, other = {}) {
    return { body, ...other };
  };
}
