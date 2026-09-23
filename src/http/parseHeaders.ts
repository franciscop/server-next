// ctx.headers: lowercase names, and an array only for a name sent twice
export type HeaderMap = Record<string, string | string[]>;

// One header as a single string, whichever shape it arrived in
export const headerValue = (value?: string | string[]): string =>
  (Array.isArray(value) ? value[0] : value) || "";

export default (raw: Headers): HeaderMap => {
  const headers: HeaderMap = {};
  raw.forEach((value, originalKey) => {
    const key = originalKey.toLowerCase();
    if (headers[key]) {
      if (!Array.isArray(headers[key])) {
        headers[key] = [headers[key] as string];
      }
      (headers[key] as string[]).push(value);
    } else {
      headers[key] = value;
    }
  });
  return headers;
};
