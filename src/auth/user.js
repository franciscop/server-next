import ServerError from "../ServerError";

const findUser = async (auth, options) => {
  if (!auth.provider) throw ServerError.AUTH_NO_PROVIDER();
  if (!options.provider.includes(auth.provider)) {
    const valid = JSON.stringify(options.provider);
    throw ServerError.AUTH_INVALID_PROVIDER({ provider: auth.provider, valid });
  }

  if (auth.provider === "email") {
    return await options.store.get(auth.email);
  }
};

export default async function user(ctx) {
  if (!ctx.auth) return;

  const user = await findUser(ctx.auth, ctx.options.auth);
  if (!user) throw ServerError.AUTH_NO_USER();
  return ctx.options.auth.cleanUser(user);
}
