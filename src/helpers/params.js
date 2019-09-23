export default (query, path) => {
  if (!/\:/.test(query) && query !== path) return;

  return query.split("/").reduce((params, part, i) => {
    if (!/^\:/.test(part)) return params;
    const name = part.replace(/^\:/, "");
    params[name] = path.split("/")[i];
    return params;
  }, {});
};
