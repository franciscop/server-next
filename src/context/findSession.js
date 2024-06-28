import { ServerError } from "../";

class NoSession {}

export default async function findSession(ctx) {
  const store = ctx.options.session?.store;

  // If there's no store at all, we don't have session available;
  // but that's okay, since it's only a problem if you try to use it
  if (!store) {
    return new Proxy(new NoSession(), {
      get(target, key) {
        if (target[key]) return target[key];
        if (key === "then") return target[key];
        throw ServerError.NO_STORE_READ({ key });
      },
      set(target, key, value) {
        if (target[key] || key === "then") {
          target[key] = value;
        } else {
          throw ServerError.NO_STORE_WRITE({ key });
        }
      },
    });
  }

  // There's a session cookie; use it as the key to get the data
  // from the store
  if (ctx.cookies.session) {
    return (await store.get(ctx.cookies.session)) || {};
  }

  return {};
}
