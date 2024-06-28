import ServerError from "../ServerError";

ServerError.extend({
  NO_STORE_WRITE: `You need a 'store' to write 'ctx.session.{key}'`,
  NO_STORE_READ: `You need a 'store' to read 'ctx.session.{key}'`,
  AUTH_INVALID_TYPE: `Invalid Authorization type, '{type}'`,
  AUTH_INVALID_TOKEN: `Invalid Authorization token`,
});

export default ServerError;
