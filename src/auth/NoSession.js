import { ServerError } from "../index.js";

class NoSession {}

export default new Proxy(NoSession, {
  get(target, key) {
    if (target[key]) return target[key];
    if (key === "then") return target[key];
    if (typeof key === "symbol") return target[key];
    throw ServerError.NO_STORE_READ({ key });
  },
  set(target, key, value) {
    if (target[key] || key === "then" || typeof key === "symbol") {
      target[key] = value;
    } else {
      throw ServerError.NO_STORE_WRITE({ key });
    }
  },
});
