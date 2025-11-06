import { ServerError } from "../index.js";

class NoSession {}

export default new Proxy(NoSession, {
  get(target: any, key: string | symbol) {
    if (target[key]) return target[key];
    if (key === "then") return target[key];
    if (typeof key === "symbol") return target[key];
    throw ServerError.NO_STORE_READ({ key: String(key) });
  },
  set(target: any, key: string | symbol, value: any) {
    if (target[key] || key === "then" || typeof key === "symbol") {
      target[key] = value;
      return true;
    } else {
      throw ServerError.NO_STORE_WRITE({ key: String(key) });
    }
  },
});
