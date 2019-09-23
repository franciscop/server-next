// Put an undetermined number of callbacks together
// Stops when one of them returns something
export default (...cbs) => async ctx => {
  for (let cb of cbs) {
    try {
      const data = await cb(ctx);
      if (data) return data;
    } catch (error) {
      return { body: error.message, status: 500 };
    }
  }
  return { body: "Not Found", status: 404 };
};
