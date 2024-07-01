export default (raw) => {
  const headers = {};
  for (let [key, value] of raw.entries()) {
    key = key.toLowerCase();
    if (headers[key]) {
      if (!Array.isArray(headers[key])) {
        headers[key] = [headers[key]];
      }
      headers[key].push(value);
    } else {
      headers[key] = value;
    }
  }
  return headers;
};
