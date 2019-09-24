export default (query, path) => {
  // They are different and there's no matching in the query
  if (!/\:/.test(query) && query !== path) return;

  // If one fails, fail it all
  return (
    query.split("/").reduce((params, part, i) => {
      if (!params) return;
      const value = path.split("/")[i];

      // If there's no param in this segment, value has to match exactly
      if (!/^\:/.test(part)) return part === value ? params : false;

      const name = part.replace(/^\:/, "");
      if (!value) return;
      params[name] = value;
      return params;
    }, {}) || false
  );
};
