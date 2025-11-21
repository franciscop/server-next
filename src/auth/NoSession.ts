import { ServerError } from "..";
import type { SerializableValue } from "..";

class NoSession {}

// Factory function to create a new NoSession proxy for each request
// This prevents state pollution between different server instances
export default function createNoSession() {
  return new Proxy(new NoSession(), {
    get(target: NoSession, key: string | symbol): SerializableValue {
      if (target[key]) return target[key];
      if (key === "then") return target[key];
      if (typeof key === "symbol") return target[key];
      throw ServerError.NO_STORE_READ({ key: String(key) });
    },
    set(target: NoSession, key: string | symbol, value: SerializableValue) {
      if (target[key] || key === "then" || typeof key === "symbol") {
        target[key] = value;
        return true;
      }
      throw ServerError.NO_STORE_WRITE({ key: String(key) });
    },
  });
}
