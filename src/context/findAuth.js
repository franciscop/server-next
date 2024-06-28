import { ServerError } from "../index.js";

export default async function findAuth(ctx) {
  // NO AUTH AT ALL
  // If there's no even auth option, nothing to do
  const store = ctx.options.auth?.store;
  if (!store) return;

  // AUTHENTICATION IS AVAILABLE
  ctx.auth = {
    type: ctx.options.auth.type,
    providers: ctx.options.auth.providers,
    store,
  };

  // If the user is not authenticated, there's no auth to retrieve
  if (!ctx.headers.authorization) return;

  // AUTHENTICATED REQUEST
  // Check the authentication header
  const [type, id] = ctx.headers.authorization.trim().split(" ");
  if (type.toLowerCase() !== "bearer") {
    throw ServerError.AUTH_INVALID_TYPE({ type });
  }
  if (id.length !== 24) {
    throw ServerError.AUTH_INVALID_TOKEN();
  }

  // Extend the basics
  ctx.auth.id = id;
  ctx.user = await store.get(id);
}
