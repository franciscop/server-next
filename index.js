import http from 'http';
import zlib from 'zlib';

/**
 * Tokenize input string.
 */
function lexer(str) {
    var tokens = [];
    var i = 0;
    while (i < str.length) {
        var char = str[i];
        if (char === "*" || char === "+" || char === "?") {
            tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
            continue;
        }
        if (char === "\\") {
            tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
            continue;
        }
        if (char === "{") {
            tokens.push({ type: "OPEN", index: i, value: str[i++] });
            continue;
        }
        if (char === "}") {
            tokens.push({ type: "CLOSE", index: i, value: str[i++] });
            continue;
        }
        if (char === ":") {
            var name = "";
            var j = i + 1;
            while (j < str.length) {
                var code = str.charCodeAt(j);
                if (
                // `0-9`
                (code >= 48 && code <= 57) ||
                    // `A-Z`
                    (code >= 65 && code <= 90) ||
                    // `a-z`
                    (code >= 97 && code <= 122) ||
                    // `_`
                    code === 95) {
                    name += str[j++];
                    continue;
                }
                break;
            }
            if (!name)
                throw new TypeError("Missing parameter name at " + i);
            tokens.push({ type: "NAME", index: i, value: name });
            i = j;
            continue;
        }
        if (char === "(") {
            var count = 1;
            var pattern = "";
            var j = i + 1;
            if (str[j] === "?") {
                throw new TypeError("Pattern cannot start with \"?\" at " + j);
            }
            while (j < str.length) {
                if (str[j] === "\\") {
                    pattern += str[j++] + str[j++];
                    continue;
                }
                if (str[j] === ")") {
                    count--;
                    if (count === 0) {
                        j++;
                        break;
                    }
                }
                else if (str[j] === "(") {
                    count++;
                    if (str[j + 1] !== "?") {
                        throw new TypeError("Capturing groups are not allowed at " + j);
                    }
                }
                pattern += str[j++];
            }
            if (count)
                throw new TypeError("Unbalanced pattern at " + i);
            if (!pattern)
                throw new TypeError("Missing pattern at " + i);
            tokens.push({ type: "PATTERN", index: i, value: pattern });
            i = j;
            continue;
        }
        tokens.push({ type: "CHAR", index: i, value: str[i++] });
    }
    tokens.push({ type: "END", index: i, value: "" });
    return tokens;
}
/**
 * Parse a string for the raw tokens.
 */
function parse(str, options) {
    if (options === void 0) { options = {}; }
    var tokens = lexer(str);
    var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
    var defaultPattern = "[^" + escapeString(options.delimiter || "/#?") + "]+?";
    var result = [];
    var key = 0;
    var i = 0;
    var path = "";
    var tryConsume = function (type) {
        if (i < tokens.length && tokens[i].type === type)
            return tokens[i++].value;
    };
    var mustConsume = function (type) {
        var value = tryConsume(type);
        if (value !== undefined)
            return value;
        var _a = tokens[i], nextType = _a.type, index = _a.index;
        throw new TypeError("Unexpected " + nextType + " at " + index + ", expected " + type);
    };
    var consumeText = function () {
        var result = "";
        var value;
        // tslint:disable-next-line
        while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
            result += value;
        }
        return result;
    };
    while (i < tokens.length) {
        var char = tryConsume("CHAR");
        var name = tryConsume("NAME");
        var pattern = tryConsume("PATTERN");
        if (name || pattern) {
            var prefix = char || "";
            if (prefixes.indexOf(prefix) === -1) {
                path += prefix;
                prefix = "";
            }
            if (path) {
                result.push(path);
                path = "";
            }
            result.push({
                name: name || key++,
                prefix: prefix,
                suffix: "",
                pattern: pattern || defaultPattern,
                modifier: tryConsume("MODIFIER") || ""
            });
            continue;
        }
        var value = char || tryConsume("ESCAPED_CHAR");
        if (value) {
            path += value;
            continue;
        }
        if (path) {
            result.push(path);
            path = "";
        }
        var open = tryConsume("OPEN");
        if (open) {
            var prefix = consumeText();
            var name_1 = tryConsume("NAME") || "";
            var pattern_1 = tryConsume("PATTERN") || "";
            var suffix = consumeText();
            mustConsume("CLOSE");
            result.push({
                name: name_1 || (pattern_1 ? key++ : ""),
                pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
                prefix: prefix,
                suffix: suffix,
                modifier: tryConsume("MODIFIER") || ""
            });
            continue;
        }
        mustConsume("END");
    }
    return result;
}
/**
 * Compile a string to a template function for the path.
 */
function compile(str, options) {
    return tokensToFunction(parse(str, options), options);
}
/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction(tokens, options) {
    if (options === void 0) { options = {}; }
    var reFlags = flags(options);
    var _a = options.encode, encode = _a === void 0 ? function (x) { return x; } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
    // Compile all the tokens into regexps.
    var matches = tokens.map(function (token) {
        if (typeof token === "object") {
            return new RegExp("^(?:" + token.pattern + ")$", reFlags);
        }
    });
    return function (data) {
        var path = "";
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (typeof token === "string") {
                path += token;
                continue;
            }
            var value = data ? data[token.name] : undefined;
            var optional = token.modifier === "?" || token.modifier === "*";
            var repeat = token.modifier === "*" || token.modifier === "+";
            if (Array.isArray(value)) {
                if (!repeat) {
                    throw new TypeError("Expected \"" + token.name + "\" to not repeat, but got an array");
                }
                if (value.length === 0) {
                    if (optional)
                        continue;
                    throw new TypeError("Expected \"" + token.name + "\" to not be empty");
                }
                for (var j = 0; j < value.length; j++) {
                    var segment = encode(value[j], token);
                    if (validate && !matches[i].test(segment)) {
                        throw new TypeError("Expected all \"" + token.name + "\" to match \"" + token.pattern + "\", but got \"" + segment + "\"");
                    }
                    path += token.prefix + segment + token.suffix;
                }
                continue;
            }
            if (typeof value === "string" || typeof value === "number") {
                var segment = encode(String(value), token);
                if (validate && !matches[i].test(segment)) {
                    throw new TypeError("Expected \"" + token.name + "\" to match \"" + token.pattern + "\", but got \"" + segment + "\"");
                }
                path += token.prefix + segment + token.suffix;
                continue;
            }
            if (optional)
                continue;
            var typeOfMessage = repeat ? "an array" : "a string";
            throw new TypeError("Expected \"" + token.name + "\" to be " + typeOfMessage);
        }
        return path;
    };
}
/**
 * Create path match function from `path-to-regexp` spec.
 */
function match(str, options) {
    var keys = [];
    var re = pathToRegexp(str, keys, options);
    return regexpToFunction(re, keys, options);
}
/**
 * Create a path match function from `path-to-regexp` output.
 */
function regexpToFunction(re, keys, options) {
    if (options === void 0) { options = {}; }
    var _a = options.decode, decode = _a === void 0 ? function (x) { return x; } : _a;
    return function (pathname) {
        var m = re.exec(pathname);
        if (!m)
            return false;
        var path = m[0], index = m.index;
        var params = Object.create(null);
        var _loop_1 = function (i) {
            // tslint:disable-next-line
            if (m[i] === undefined)
                return "continue";
            var key = keys[i - 1];
            if (key.modifier === "*" || key.modifier === "+") {
                params[key.name] = m[i].split(key.prefix + key.suffix).map(function (value) {
                    return decode(value, key);
                });
            }
            else {
                params[key.name] = decode(m[i], key);
            }
        };
        for (var i = 1; i < m.length; i++) {
            _loop_1(i);
        }
        return { path: path, index: index, params: params };
    };
}
/**
 * Escape a regular expression string.
 */
function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
/**
 * Get the flags for a regexp from the options.
 */
function flags(options) {
    return options && options.sensitive ? "" : "i";
}
/**
 * Pull out keys from a regexp.
 */
function regexpToRegexp(path, keys) {
    if (!keys)
        return path;
    // Use a negative lookahead to match only capturing groups.
    var groups = path.source.match(/\((?!\?)/g);
    if (groups) {
        for (var i = 0; i < groups.length; i++) {
            keys.push({
                name: i,
                prefix: "",
                suffix: "",
                modifier: "",
                pattern: ""
            });
        }
    }
    return path;
}
/**
 * Transform an array into a regexp.
 */
function arrayToRegexp(paths, keys, options) {
    var parts = paths.map(function (path) { return pathToRegexp(path, keys, options).source; });
    return new RegExp("(?:" + parts.join("|") + ")", flags(options));
}
/**
 * Create a path regexp from string input.
 */
function stringToRegexp(path, keys, options) {
    return tokensToRegexp(parse(path, options), keys, options);
}
/**
 * Expose a function for taking tokens and returning a RegExp.
 */
function tokensToRegexp(tokens, keys, options) {
    if (options === void 0) { options = {}; }
    var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function (x) { return x; } : _d;
    var endsWith = "[" + escapeString(options.endsWith || "") + "]|$";
    var delimiter = "[" + escapeString(options.delimiter || "/#?") + "]";
    var route = start ? "^" : "";
    // Iterate over the tokens and create our regexp string.
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var token = tokens_1[_i];
        if (typeof token === "string") {
            route += escapeString(encode(token));
        }
        else {
            var prefix = escapeString(encode(token.prefix));
            var suffix = escapeString(encode(token.suffix));
            if (token.pattern) {
                if (keys)
                    keys.push(token);
                if (prefix || suffix) {
                    if (token.modifier === "+" || token.modifier === "*") {
                        var mod = token.modifier === "*" ? "?" : "";
                        route += "(?:" + prefix + "((?:" + token.pattern + ")(?:" + suffix + prefix + "(?:" + token.pattern + "))*)" + suffix + ")" + mod;
                    }
                    else {
                        route += "(?:" + prefix + "(" + token.pattern + ")" + suffix + ")" + token.modifier;
                    }
                }
                else {
                    route += "(" + token.pattern + ")" + token.modifier;
                }
            }
            else {
                route += "(?:" + prefix + suffix + ")" + token.modifier;
            }
        }
    }
    if (end) {
        if (!strict)
            route += delimiter + "?";
        route += !options.endsWith ? "$" : "(?=" + endsWith + ")";
    }
    else {
        var endToken = tokens[tokens.length - 1];
        var isEndDelimited = typeof endToken === "string"
            ? delimiter.indexOf(endToken[endToken.length - 1]) > -1
            : // tslint:disable-next-line
                endToken === undefined;
        if (!strict) {
            route += "(?:" + delimiter + "(?=" + endsWith + "))?";
        }
        if (!isEndDelimited) {
            route += "(?=" + delimiter + "|" + endsWith + ")";
        }
    }
    return new RegExp(route, flags(options));
}
/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 */
function pathToRegexp(path, keys, options) {
    if (path instanceof RegExp)
        return regexpToRegexp(path, keys);
    if (Array.isArray(path))
        return arrayToRegexp(path, keys, options);
    return stringToRegexp(path, keys, options);
}

var pathToRegex = /*#__PURE__*/Object.freeze({
    __proto__: null,
    parse: parse,
    compile: compile,
    tokensToFunction: tokensToFunction,
    match: match,
    regexpToFunction: regexpToFunction,
    tokensToRegexp: tokensToRegexp,
    pathToRegexp: pathToRegexp
});

const match$1 = undefined;

const decode = decodeURIComponent;

// This returns false if the path does not match the query
var params = (query, path) => match$1(query, { decode })(path).params || false;

// Put an undetermined number of callbacks together
// Stops when one of them returns something
var reduce = (...cbs) => {
  const handlers = cbs.flat(Infinity);

  return async (ctx) => {
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

var parser = (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = false;
  }

  return [path, reduce(cbs)];
};

// Normalize the reply to return always an object in the same format
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Origin, X-Requested-With, Content-Type, Accept",
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, DELETE, HEAD",
};

// https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_request_setheader_name_value
// "Use an array of strings here to send multiple headers with the same name"
const generateCookies = (cookies) => {
  return Object.entries(cookies).map((p) => p.join("="));
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
    headers: { ...headers, "content-type": "application/json" },
  };
};

// Node native body parser
const parseBody = async (req) => {
  return new Promise((done, fail) => {
    const type = req.headers["content-type"];
    const parser = /application\/json/.test(type)
      ? (data) => JSON.parse(data)
      : (data) => data;
    const data = [];
    req
      .on("data", (chunk) => {
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

var bodyParser = async (ctx) => {
  // No parsing for now
  if (!ctx.req) return;

  // Parsing it out of the request's text() method
  if (ctx.req.text) {
    ctx.body = await readRequestBody(ctx.req);
    return;
  }
  ctx.body = await parseBody(ctx.req);
};

const decode$1 = str => {
  try {
    return decodeURIComponent(str).catch(err => str);
  } catch (e) {
    return str;
  }
};

// Extracted originally from npm's "cookie"
const parse$1 = str => {
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
      cookies[key] = decode$1(val);
    }
    return cookies;
  }, {});
};

var cookieParser = ctx => {
  ctx.cookies = {};
  if (!ctx.headers.cookie) return;
  ctx.cookies = parse$1(ctx.headers.cookie);
};

const decode$2 = decodeURIComponent;

// Parse the query from the url (without the `?`)
const parseQuery = (query = "") => {
  return query
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .map((p) => p.split("="))
    .reduce((all, [key, val]) => ({ ...all, [decode$2(key)]: decode$2(val) }), {});
};

// Available in Node globally since 10.0.0
// https://nodejs.org/api/globals.html#globals_url
var urlParser = (ctx) => {
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
const getIp = (req) => {
  return (
    (req.headers["x-forwarded-for"] || "").split(",").pop() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
  );
};

// Launch the server for the Node.js environment
var node = async (handler, options = {}) => {
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
      req,
      options,
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
    server.listen(options.port, (error) => {
      if (error) reject(error);
      resolve({ options, handler, runtime, close: () => server.close() });
    });
  });
};

var index = (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right path
    if (ctx.params) {
      return handler(ctx);
    }
  };
};

var index$1 = (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right method and path
    if (ctx.method === "DELETE" && ctx.params) {
      return handler(ctx);
    }
  };
};

var index$2 = (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right method and path
    if (ctx.method === "GET" && ctx.params) {
      return handler(ctx);
    }
  };
};

var index$3 = (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right method and path
    if (ctx.method === "HEAD" && ctx.params) {
      return handler(ctx);
    }
  };
};

var index$4 = (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right method and path
    if (ctx.method === "OPTIONS" && ctx.params) {
      return handler(ctx);
    }
  };
};

var index$5 = (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right method and path
    if (ctx.method === "PATCH" && ctx.params) {
      return handler(ctx);
    }
  };
};

var index$6 = (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right method and path
    if (ctx.method === "POST" && ctx.params) {
      return handler(ctx);
    }
  };
};

var index$7 = (...args) => {
  const [path, handler] = parser(...args);

  return (ctx) => {
    // The parameters are defined only if the path matches the query
    ctx.params = params(path, ctx.path);

    // Run this handler only if it's the right method and path
    if (ctx.method === "PUT" && ctx.params) {
      return handler(ctx);
    }
  };
};

// Some other, non-HTTP methods but routers nonetheless
// export { default as socket } from "./socket";
// export { default as domain } from "./domain";

// The main function that runs the whole thing
var index$8 = async (options = {}, ...middleware) => {
  if (typeof options === "function") {
    middleware.unshift(options);
    options = {};
  }

  const engine = options.engine || node;

  // Generate a single callback with all the middleware
  const handler = reduce(middle, middleware);

  return engine((ctx) => reply(handler, ctx), options);
};

export default index$8;
export { index as any, index$1 as del, index$2 as get, index$3 as head, index$4 as options, index$5 as patch, index$6 as post, index$7 as put };
