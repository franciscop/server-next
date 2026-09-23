import mimes from "../http/mimes";

// What a request body is, decided once from its Content-Type, so parsing, the
// uploads check and the size pre-check can never disagree about it.
export type BodyKind = "multipart" | "form" | "json" | "text" | "file";

// The bare type, without parameters (charset, boundary) or case
const base = (type: string): string => type.split(";")[0].trim().toLowerCase();

const JSON_TYPE = base(mimes.json);

export default function bodyKind(contentType?: string): BodyKind {
  const type = base(contentType || "");
  // No declared type is read as text, the most forgiving of the buffered kinds.
  // The two form encodings are not file extensions, so not in the mimes table.
  if (!type || type.startsWith("text/")) return "text";
  if (type === "multipart/form-data") return "multipart";
  if (type === "application/x-www-form-urlencoded") return "form";
  // RFC 6839: a "+json" suffix is JSON too (JSON:API, JSON-LD, problem+json)
  if (type === JSON_TYPE || type.endsWith("+json")) return "json";
  // Anything else is a raw file: an image, a video, application/octet-stream
  return "file";
}
