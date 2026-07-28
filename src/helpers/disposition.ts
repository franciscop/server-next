// Builds the `Content-Disposition` value for a download. The filename goes in
// twice when it isn't plain ASCII (RFC 6266): a quoted ASCII fallback, plus an
// RFC 5987 `filename*` that clients actually decode. Percent-encoding the
// quoted form instead would save the file *as* "my%20file.csv", since that
// parameter is literal text, not an encoded one.

// RFC 5987 attr-char excludes ' ( ) * , which encodeURIComponent leaves as-is
const encodeExt = (name: string) =>
  encodeURIComponent(name).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export default function disposition(name?: string): string {
  if (!name) return "attachment";

  // Drop CR/LF (header injection) and any path, keeping just the filename
  const clean = name.replace(/[\r\n]/g, "").split(/[\\/]/).pop() || "";
  if (!clean) return "attachment";

  // The quoted fallback is ASCII-only, with quotes and backslashes escaped
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strip C0/non-ASCII
  const ascii = clean.replace(/[^\x20-\x7e]/g, "?");
  const value = `attachment; filename="${ascii.replace(/["\\]/g, "\\$&")}"`;

  // Only a name that lost characters above needs the extended parameter;
  // escaping is lossless, so a quote alone doesn't call for one
  if (clean === ascii) return value;
  return `${value}; filename*=UTF-8''${encodeExt(clean)}`;
}
