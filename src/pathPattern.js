import { URLPattern } from "urlpattern-polyfill";

// const { URLPattern } = pkg;

export default function pathPattern(pattern, path) {
  pattern = pattern.replace(/\/$/, "") || "/";
  path = path.replace(/\/$/, "") || "/";
  const origin =
    typeof location === "object" ? location.origin : "https://example.com/";
  const patt = new URLPattern(pattern, origin);
  const match = patt.exec(path, origin);
  // console.log(match, path, pattern);
  if (!match) return false;
  const groups = match.pathname.groups;
  const rest = Object.keys(groups)
    .filter((k) => /^\d+$/.test(k))
    .reduce((all, key) => {
      const value = groups[key];
      delete groups[key];
      if (!value) return all;
      all = all.concat(...value.split("/"));
      return all;
    }, []);
  if (rest.length) groups["*"] = rest;
  return groups;
}
