export default function router() {
  if (!(this instanceof router)) {
    return new router();
  }
  this.handlers = {
    socket: [],
    get: [],
    head: [],
    post: [],
    put: [],
    patch: [],
    delete: [],
    options: [],
  };
}

router.prototype.handle = function (method, path, ...middleware) {
  // Do not try to optimize, we NEED the method to remain '*' here so that
  // it doesn't auto-finish
  if (method === "*") {
    for (const m in this.handlers) {
      this.handlers[m].push([method, path, ...middleware]);
    }
  } else {
    this.handlers[method].push([method, path, ...middleware]);
  }

  return this;
};

router.prototype.socket = function (path, ...middleware) {
  if (typeof path === "string") {
    return this.handle("socket", path, ...middleware);
  }
  return this.handle("socket", "*", path, ...middleware);
};

router.prototype.get = function (path, ...middleware) {
  if (typeof path === "string") {
    return this.handle("get", path, ...middleware);
  }
  return this.handle("get", "*", path, ...middleware);
};

router.prototype.head = function (path, ...middleware) {
  if (typeof path === "string") {
    return this.handle("head", path, ...middleware);
  }
  return this.handle("head", "*", path, ...middleware);
};

router.prototype.post = function (path, ...middleware) {
  if (typeof path === "string") {
    return this.handle("post", path, ...middleware);
  }
  return this.handle("post", "*", path, ...middleware);
};

router.prototype.put = function (path, ...middleware) {
  if (typeof path === "string") {
    return this.handle("put", path, ...middleware);
  }
  return this.handle("put", "*", path, ...middleware);
};

router.prototype.patch = function (path, ...middleware) {
  if (typeof path === "string") {
    return this.handle("patch", path, ...middleware);
  }
  return this.handle("patch", "*", path, ...middleware);
};

router.prototype.del = function (path, ...middleware) {
  if (typeof path === "string") {
    return this.handle("del", path, ...middleware);
  }
  return this.handle("del", "*", path, ...middleware);
};

router.prototype.options = function (path, ...middleware) {
  if (typeof path === "string") {
    return this.handle("options", path, ...middleware);
  }
  return this.handle("head", "*", path, ...middleware);
};

router.prototype.use = function (...middleware) {
  if (typeof middleware[0] === "string") {
    return this.handle("*", ...middleware);
  }
  return this.handle("*", "*", ...middleware);
};
