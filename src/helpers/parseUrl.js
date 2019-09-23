// Decode the url element
const decode = decodeURIComponent;

// Parse the query from the url (without the `?`)
const parseQuery = query => {
  return query
    .split("&")
    .map(p => p.split("="))
    .reduce((all, [key, val]) => ({ ...all, [decode(key)]: decode(val) }));
};

export default url => {
  const [path, query = ""] = url.split("?");
  return { path, query: query ? parseQuery(query) : {} };
};
