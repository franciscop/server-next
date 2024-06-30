// Takes an object and returns a string with the proper cookie values
export default function createCookies(cookies) {
  if (!cookies || !Object.keys(cookies).length) return [];
  return Object.entries(cookies).map(([key, val]) => {
    if (typeof val === "string") {
      val = { value: val, path };
    }
    const { value, path } = val;
    return `${key}=${value}${path ? ";Path=" + path : ""}`;
  });
}
