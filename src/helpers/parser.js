import reduce from "./reduce.js";

export default (path, ...cbs) => {
  // Accept a path first and then a list of callbacks
  if (typeof path !== "string") {
    cbs.unshift(path);
    path = false;
  }

  return [path, reduce(cbs)];
};
