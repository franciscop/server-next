var params = (query, path) => {
  // They are different and there's no matching in the query
  if (!/\:/.test(query) && query !== path) return;

  // If one fails, fail it all
  return (
    query.split("/").reduce((params, part, i) => {
      if (!params) return;
      const value = path.split("/")[i];

      // If there's no param in this segment, value has to match exactly
      if (!/^\:/.test(part)) return part === value ? params : false;

      const name = part.replace(/^\:/, "");
      if (!value) return;
      params[name] = value;
      return params;
    }, {}) || false
  );
};

// Put an undetermined number of callbacks together
// Stops when one of them returns something
var reduce = (...cbs) => {
  const handlers = cbs.flat(Infinity);

  return async ctx => {
    try {
      for (let cb of handlers) {
        const data = await cb(ctx);
        if (data) return data;
      }
    } catch (error) {
      return error;
    }
  };
};

// Normalize the reply to return always an object in the same format
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Origin, X-Requested-With, Content-Type, Accept",
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, DELETE, HEAD"
};

// https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_request_setheader_name_value
// "Use an array of strings here to send multiple headers with the same name"
const generateCookies = cookies => {
  return Object.entries(cookies).map(p => p.join("="));
};

var reply = async (handler, ctx) => {
  const data = await handler(ctx);
  const headers = {};
  if (ctx.options.cors === true) {
    for (let key in cors) {
      headers[key] = cors[key];
    }
    // Quick reply for the OPTIONS CORS
    if (ctx.method === "OPTIONS") {
      return { body: "", headers, status: 200 };
    }
  }

  // Did no throw, but did not resolve === not found
  if (!data) return { body: "Not found", headers, status: 404 };

  // The function means the hanlder knows what it's doing and wants a raw reply
  if (typeof data === "function") {
    const reply = await data(ctx);
    if (reply.cookies) {
      headers["set-cookie"] = generateCookies(reply.cookies);
    }
    return { ...reply, status: 200, headers: { ...reply.headers, ...headers } };
  }

  // A plain string response
  if (typeof data === "string") return { body: data, headers, status: 200 };

  // A status number response
  if (typeof data === "number") return { body: "", headers, status: data };

  // Most basic of error handling, anything higher level should be on user code
  if (data instanceof Error) {
    return { status: data.status || 500, headers, body: data.message };
  }

  // Treat it as a plain object
  return {
    body: JSON.stringify(data),
    status: data.status || 200,
    headers: { ...headers, "content-type": "application/json" }
  };
};

// Node native body parser
const parseBody = async req => {
  return new Promise((done, fail) => {
    const type = req.headers["content-type"];
    const parser = /application\/json/.test(type)
      ? data => JSON.parse(data)
      : data => data;
    const data = [];
    req
      .on("data", chunk => {
        data.push(chunk);
      })
      .on("end", () => {
        const raw = Buffer.concat(data).toString();
        try {
          done(parser(raw));
        } catch (error) {
          fail(error);
        }
      })
      .on("error", fail);
  });
};

// Cloudflare body parser as https://developers.cloudflare.com/workers/templates/snippets/post_data/
async function readRequestBody(request) {
  const { headers } = request;
  const contentType = headers.get("content-type") || "text/html";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    return JSON.stringify(body);
  } else if (contentType.includes("application/text")) {
    const body = await request.text();
    return body;
  } else if (contentType.includes("text/html")) {
    const body = await request.text();
    return body;
  } else if (contentType.includes("form")) {
    const formData = await request.formData();
    let body = {};
    for (let entry of formData.entries()) {
      body[entry[0]] = entry[1];
    }
    return JSON.stringify(body);
  } else {
    let myBlob = await request.blob();
    var objectURL = URL.createObjectURL(myBlob);
    return objectURL;
  }
}

var bodyParser = async ctx => {
  // No parsing for now
  if (!ctx.req) return;

  // Parsing it out of the request's text() method
  if (ctx.req.text) {
    ctx.body = await readRequestBody(ctx.req);
    return;
  }
  ctx.body = await parseBody(ctx.req);
};

const decode = str => {
  try {
    return decodeURIComponent(str).catch(err => str);
  } catch (e) {
    return str;
  }
};

// Extracted originally from npm's "cookie"
const parse = str => {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }

  return str.split(/; */).reduce((cookies, pair) => {
    const eq_idx = pair.indexOf("=");

    // skip things that don't look like key=value
    if (eq_idx < 0) return cookies;

    const key = pair.substr(0, eq_idx).trim();
    const val = pair.substr(eq_idx + 1).trim();

    // unquote any quoted value
    if ('"' == val[0]) {
      val = val.slice(1, -1);
    }

    // only assign once; the first time
    if (undefined == cookies[key]) {
      cookies[key] = decode(val);
    }
    return cookies;
  }, {});
};

var cookieParser = ctx => {
  ctx.cookies = {};
  if (!ctx.headers.cookie) return;
  ctx.cookies = parse(ctx.headers.cookie);
};

const decode$1 = decodeURIComponent;

// Parse the query from the url (without the `?`)
const parseQuery = (query = "") => {
  return query
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .map(p => p.split("="))
    .reduce((all, [key, val]) => ({ ...all, [decode$1(key)]: decode$1(val) }), {});
};

// Available in Node globally since 10.0.0
// https://nodejs.org/api/globals.html#globals_url
var urlParser = ctx => {
  const url = new URL(ctx.url);
  ctx.protocol = url.protocol;
  ctx.host = url.host;
  ctx.port = url.port;
  ctx.hostname = url.hostname;
  ctx.password = url.password;
  ctx.username = url.username;
  ctx.origin = url.origin;
  ctx.path = url.pathname;
  ctx.query = parseQuery(url.search);
};

var middle = [urlParser, bodyParser, cookieParser];

const runtime = "node";

const getUrl = ({ protocol = "http", headers, url = "/" }) => {
  return protocol + "://" + headers["host"] + url;
};

// https://stackoverflow.com/a/19524949/938236
const getIp = req => {
  return (
    (req.headers["x-forwarded-for"] || "").split(",").pop() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
  );
};

// Launch the server for the Node.js environment
var node = async (handler, options = {}) => {
  // This code runs ONE time on the first cold start, and we know that it runs
  // in the Node.js environment. So we can import Node.js libraries here safely
  const [http, zlib] = await Promise.all([import('http'), import('zlib')]);

  const compress = (data, headers) => {
    // Don't compress it if it's tiny
    if (data.length < 1000) {
      return data;
    }
    headers["Content-Encoding"] = "gzip";
    return new Promise((done, fail) => {
      const buffer = Buffer.from(data || "", "utf-8");
      zlib.gzip(buffer, (error, result) => {
        if (error) return fail(error);
        return done(result);
      });
    });
  };

  const server = http.createServer(async (req, res) => {
    // Handle each of the API calls here:
    const { status = 200, body = "", headers = {} } = await handler({
      url: getUrl(req),
      method: req.method,
      headers: req.headers,
      ip: getIp(req),
      runtime,
      req
    });

    res.statusCode = status;
    const compressed = await compress(body, headers);
    for (let key in headers) {
      // https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_request_setheader_name_value
      // "Use an array of strings here to send multiple headers with the same name"
      res.setHeader(key, headers[key]);
    }

    res.end(compressed);
  });

  return new Promise((resolve, reject) => {
    server.listen(options.port, error => {
      if (error) reject(error);
      resolve({ options, handler, runtime, close: () => server.close() });
    });
  });
};

const runtime$1 = "cloudflare";

const getUrl$1 = ({ url }) => decodeURI(url);

const getIp$1 = req => req.headers.get("CF-Connecting-IP");

// At least one header has to be read first so that .entries() works
const getHeaders = ({ headers }) => {
  const plain = {};
  for (let entry of headers.entries()) {
    headers[entry[0]] = entry[1];
  }
  return plain;
};

// Launch the server in a Cloudflare Worker
var cloudflare = (handler, options = {}) => {
  addEventListener("fetch", e => {
    const response = handler({
      url: getUrl$1(e.request),
      method: e.request.method,
      headers: getHeaders(e.request),
      ip: getIp$1(e.request),
      runtime: runtime$1,
      req: e.request
    }).then(({ status, body, headers }) => {
      return new Response(body, { status, headers });
    });
    return e.respondWith(response);
  });
  return Promise.resolve({ options, handler, runtime: runtime$1, close: () => {} });
};

// Loosely find which one is the correct runtime through ducktyping
var getEngine = () => {
  if (typeof addEventListener !== "undefined" && typeof fetch !== "undefined") {
    return cloudflare;
  }

  // It is Node.js by default
  return node;
};

var index = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};

var index$1 = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (ctx.method !== "GET") return;
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};

var index$2 = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (ctx.method !== "POST") return;
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};

var index$3 = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (ctx.method !== "PUT") return;
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};

var index$4 = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (ctx.method !== "PATCH") return;
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};

var index$5 = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (ctx.method !== "DELETE") return;
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};

var index$6 = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (ctx.method !== "HEAD") return;
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};

var index$7 = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = "*";
  }
  const handler = reduce(cbs);

  return ctx => {
    if (ctx.method !== "OPTIONS") return;
    if (path === "*") return handler(ctx);

    // Make sure the URL matches
    ctx.params = params(path, ctx.path);
    if (!ctx.params) return;
    return handler(ctx);
  };
};

// Some other, non-HTTP methods but routers nonetheless
// export { default as socket } from "./socket";
// export { default as domain } from "./domain";

// The main function that runs the whole thing
var index$8 = async (options = {}, ...middleware) => {
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

export default index$8;
export { index as any, index$5 as del, index$1 as get, index$6 as head, index$7 as options, index$4 as patch, index$2 as post, index$3 as put };
