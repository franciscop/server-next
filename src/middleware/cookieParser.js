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

export default ctx => {
  ctx.cookies = {};
  if (!ctx.headers.cookie) return;

  ctx.cookies = parse(ctx.headers.cookie);
};
