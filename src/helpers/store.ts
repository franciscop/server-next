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
export default function toStore(source: StoreSource): KVStore {
  const store = source as KVStore;
  if (
    store &&
    typeof store.prefix === "function" &&
    typeof store.get === "function" &&
    typeof store.set === "function"
  ) {
    return store;
  }
  return kv(source) as unknown as KVStore;
}
