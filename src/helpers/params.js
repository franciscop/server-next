import * as pathToRegex from "path-to-regexp";

const match = pathToRegex.default.match;

const decode = decodeURIComponent;

// This returns false if the path does not match the query
export default (query, path) => match(query, { decode })(path).params || false;
