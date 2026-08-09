import kv from "polystore";
import type { KVStore, StoreSource } from "../types";

// Normalize whatever the `store` / `session` options were given into a store:
// a Map, a Redis client, a connection string, ... all go through kv().
//
// A store (ours or a hand-rolled adapter, the documented get/set/has/del/keys/
// prefix shape) is returned untouched instead of being forced through kv():
// polystore's own adapters expect `iterate()`, not `keys()`, so a custom
// adapter would fail kv()'s validation. `prefix()` is what tells a store apart
// from a raw client, since a Map or a Redis client has get/set but no prefix.
// A built store (kv(...) or a hand-rolled adapter) vs a raw Map/client:
// `prefix()` is the tell, since a Map or a Redis client has get/set but no prefix
export function isStore(source: StoreSource): boolean {
  const store = source as KVStore;
  return Boolean(
    store &&
      typeof store.prefix === "function" &&
      typeof store.get === "function" &&
      typeof store.set === "function",
  );
}

export default function toStore(source: StoreSource): KVStore {
  if (isStore(source)) return source as KVStore;
  return kv(source) as unknown as KVStore;
}

// Same, but raw sources get a default expiry, since a Map or a Redis client
// can't carry one; a built store keeps whatever the app gave it
export function toStoreExpiring(source: StoreSource, expires: string): KVStore {
  if (isStore(source)) return source as KVStore;
  return (kv(source) as any).expires(expires) as KVStore;
}
