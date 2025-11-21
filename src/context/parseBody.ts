import { createId } from "../helpers";
import type { Bucket } from "..";

function getBoundary(header?: string): string | null {
  if (!header) return null;

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

function getMatching(string: string, regex: RegExp): string {
  const matches = string.match(regex);
  return matches?.[1] ?? "";
}

const saveFile = async (
  name: string,
  value: Buffer,
  bucket: Bucket,
): Promise<string> => {
  const ext = name.split(".").pop();
  const id = `${createId()}.${ext}`;
  await bucket.write(id, value);
  return id;
};

// Utility function to split a buffer
function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const result: Buffer[] = [];
  let start = 0;
  let index = buffer.indexOf(delimiter);

  while (index !== -1) {
    result.push(buffer.slice(start, index));
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }

  result.push(buffer.slice(start));
  return result;
}

const BREAK_BUFFER = Buffer.from("\r\n\r\n");

// Simple heuristic to guess if a buffer is text
function isProbablyText(buffer: Buffer): boolean {
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    const byte = buffer[i];
    if (byte === 0) return false; // null byte → binary
    if (byte < 0x07 || (byte > 0x0d && byte < 0x20)) return false;
  }
  return true;
}

export default async function parseBody(
  raw: Buffer | Request | { arrayBuffer: () => Promise<ArrayBuffer> },
  contentType?: string | string[],
  bucket?: Bucket,
): Promise<any> {
  const contentTypeStr = Array.isArray(contentType)
    ? contentType[0]
    : contentType;

  let rawBuffer: Buffer;

  if (raw instanceof Buffer) {
    rawBuffer = raw;
  } else if ("arrayBuffer" in raw && typeof raw.arrayBuffer === "function") {
    const arrayBuf = await raw.arrayBuffer();
    rawBuffer = Buffer.from(arrayBuf);
  } else {
    throw new Error("Unsupported raw type");
  }

  if (!rawBuffer) return {};

  // Handle plain text or JSON first
  if (!contentTypeStr || /text\/plain/.test(contentTypeStr)) {
    return rawBuffer.toString("utf-8");
  }
  if (/application\/json/.test(contentTypeStr)) {
    return JSON.parse(rawBuffer.toString("utf-8"));
  }

  // Multipart
  const boundary = getBoundary(contentTypeStr);
  if (!boundary) return null;

  const body: Record<string, any> = {};
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(rawBuffer, boundaryBuffer);

  for (const part of parts) {
    if (part.length === 0 || part.equals(Buffer.from("--\r\n"))) continue;

    const idx = part.indexOf(BREAK_BUFFER);
    if (idx === -1) continue;

    const headerStr = part.slice(0, idx).toString("utf-8");
    const contentBuf = part.slice(idx + BREAK_BUFFER.length, part.length - 2);

    const name = getMatching(headerStr, /name="(.+?)"/)
      .trim()
      .replace(/\[\]$/, "");
    if (!name) continue;

    const filename = getMatching(headerStr, /filename="(.+?)"/).trim();

    if (filename) {
      if (!bucket) throw new Error("Bucket is required to save files");
      body[name] = await saveFile(filename, contentBuf, bucket);
    } else {
      const value = isProbablyText(contentBuf)
        ? contentBuf.toString("utf-8").trim()
        : contentBuf; // keep as Buffer if unknown
      if (body[name]) {
        if (!Array.isArray(body[name])) body[name] = [body[name]];
        body[name].push(value);
      } else {
        body[name] = value;
      }
    }
  }

  return body;
}
