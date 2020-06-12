// Put an undetermined number of callbacks together
// Stops when one of them returns something
export default (...cbs) => {
  const handlers = cbs.flat(Infinity);

  return async (ctx) => {
    try {
      for (let cb of handlers) {
        const data = await cb(ctx);
        if (data) return data;
      }
    } catch (error) {
      return error;
    }
  };
};
