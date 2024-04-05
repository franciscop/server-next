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

// INTERNAL
router.prototype.handle = function (method, path, ...middleware) {
  this.handlers[method].push([method, path, ...middleware]);
  return this;
};

router.prototype.socket = function (path, ...middleware) {
  return this.handle("socket", path, ...middleware);
};

router.prototype.get = function (path, ...middleware) {
  return this.handle("get", path, ...middleware);
};

router.prototype.head = function (path, ...middleware) {
  return this.handle("head", path, ...middleware);
};

router.prototype.post = function (path, ...middleware) {
  return this.handle("post", path, ...middleware);
};

router.prototype.put = function (path, ...middleware) {
  return this.handle("put", path, ...middleware);
};

router.prototype.patch = function (path, ...middleware) {
  return this.handle("patch", path, ...middleware);
};

router.prototype.del = function (path, ...middleware) {
  return this.handle("del", path, ...middleware);
};

router.prototype.options = function (path, ...middleware) {
  return this.handle("options", path, ...middleware);
};
