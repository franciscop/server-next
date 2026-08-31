export default (raw: Headers): Record<string, string | string[]> => {
  const headers: Record<string, string | string[]> = {};
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
