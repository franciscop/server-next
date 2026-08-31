import isReadableStream from "../util/isReadableStream";
import iteratorToReadable from "../util/iteratorToReadable";
import mimes from "../http/mimes";
import setIfAbsent from "../http/setIfAbsent";
import toWeb from "../util/toWeb";

// Whether a string body should be sent as HTML instead of plain text. It must
// open with something tag-like: a tag name, a closing tag, or a doctype/comment.
// A bare '<' isn't enough, or text like "<3 you all" would be sent as markup
// (and rendered as such when it comes from user input).
const TAG = /^\s*<[a-zA-Z!/]/;
const isHtml = (body: string): boolean => TAG.test(body);

// Fill-if-absent, so an explicit type()/headers() content-type always wins
function fill(headers: Headers, type?: string | null, length?: number): void {
  setIfAbsent(headers, "content-type", type);
  if (length != null) setIfAbsent(headers, "content-length", String(length));
}

// A body value into what `new Response()` takes, setting content-type and
// content-length when they are still unset. Pure serialization by shape:
// statuses, Reply chaining and Response merging stay in reply.send().
export default function serialize(body: any, headers: Headers): BodyInit {
  if (body instanceof Blob) {
    fill(headers, body.type);
    return body;
  }

  if (typeof body === "string") {
    fill(headers, isHtml(body) ? mimes.html : mimes.text, Buffer.byteLength(body));
    return body;
  }

  // Buffer or any typed array (e.g. the Uint8Array from a bucket file's
  // bytes()) is sent as raw bytes.
  if (body instanceof Uint8Array) {
    fill(headers, null, body.length);
    return body as BodyInit;
  }

  // A web ReadableStream passes through; a node stream is normalized to one
  if (typeof body?.getReader === "function") return body;
  if (isReadableStream(body)) return toWeb(body);

  // Generators stream their chunks as they are produced. Arrays are data,
  // not a stream, so they fall through to JSON below (as returning one does)
  if (
    body?.[Symbol.asyncIterator] ||
    (!Array.isArray(body) && body?.[Symbol.iterator])
  ) {
    return iteratorToReadable(body);
  }

  // Default sends it as json. Bare `application/json`, no charset: JSON is
  // always UTF-8 by spec, so the param is redundant (see json() in reply.ts).
  const payload = JSON.stringify(body);
  fill(headers, "application/json", Buffer.byteLength(payload));
  return payload;
}
