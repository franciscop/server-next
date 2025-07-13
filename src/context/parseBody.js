import { createId } from "../helpers/index.js";

function getBoundary(header) {
  if (!header) return null;

  // When we set the `content-type` manually on fetch(), it won't include the
  // boundary and it's recommended not to set it manually:
  // https://stackoverflow.com/q/39280438/938236
  if (header.includes("multipart/form-data") && !header.includes("boundary=")) {
    console.error("Do not set the `Content-Type` manually for FormData");
  }

  const items = header.split(";");
  for (const item of items) {
    const trimmedItem = item.trim();
    if (trimmedItem.startsWith("boundary=")) {
      return trimmedItem.split("=")[1].trim();
    }
  }
  return null;
}

function getMatching(string, regex) {
  const matches = string.match(regex);
  return matches?.[1] ? matches[1] : "";
}

const saveFile = async (name, value, bucket) => {
  const ext = name.split(".").pop();
  const id = `${createId()}.${ext}`;
  await bucket.write(id, value, "binary");
  return id;
};

// Utility function to split a buffer
function splitBuffer(buffer, delimiter) {
  const result = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);

  while (index !== -1) {
    result.push(buffer.slice(start, index));
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }

  result.push(buffer.slice(start));
  return result;
}

const BREAK = "\r\n\r\n";

export default async function parseBody(raw, contentType, bucket) {
  const baseBuffer = typeof raw === "string" ? raw : await raw.arrayBuffer();
  const rawBuffer = Buffer.from(baseBuffer);
  if (!rawBuffer) return {};

  if (!contentType || /text\/plain/.test(contentType)) {
    return rawBuffer.toString(); // Return as plain text
  }

  if (/application\/json/.test(contentType)) {
    return JSON.parse(rawBuffer.toString()); // Parse JSON
  }

  const boundary = getBoundary(contentType);
  if (!boundary) return null;

  const body = {};
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(rawBuffer, boundaryBuffer);

  for (const part of parts) {
    if (part.length === 0 || part.equals(Buffer.from("--\r\n"))) continue;

    const partString = part.toString();
    const name = getMatching(partString, /(?:name=")(.+?)(?:")/)
      .trim()
      .replace(/\[\]$/, "");
    if (!name) continue;

    const filename = getMatching(partString, /(?:filename=")(.*?)(?:")/).trim();

    if (!part.includes(BREAK)) continue;

    // Content starts after headers and "\r\n\r\n",  remove trailing CRLF
    const content = part.slice(part.indexOf(BREAK) + 4, part.length - 2);

    if (filename) {
      // Save binary content as a file
      body[name] = await saveFile(filename, content, bucket);
    } else {
      // Treat content as text
      const value = content.toString().trim();
      if (body[name]) {
        if (!Array.isArray(body[name])) {
          body[name] = [body[name]];
        }
        body[name].push(value);
      } else {
        body[name] = value;
      }
    }
  }

  return body;
}
