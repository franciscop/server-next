import type { Bucket } from "..";
import { INF, tooLarge } from "./bodyLimit";
import type { LimitOptions } from "./upload";
import {
  asIterable,
  type Budget,
  endPart,
  feedPart,
  type Part,
  startPart,
} from "./bodyParts";

// RFC 2045: the parameter name is case-insensitive and its value may be
// quoted; RFC 2046 allows "=" inside a boundary, so only the first one splits.
export function getBoundary(header?: string): string | null {
  if (!header) return null;
  for (const item of header.split(";")) {
    const part = item.trim();
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim().toLowerCase() !== "boundary") continue;
    const value = part
      .slice(eq + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1");
    return value || null;
  }
  return null;
}

const BREAK = Buffer.from("\r\n\r\n");

// A streaming multipart/form-data parser. It scans for the boundary delimiter
// across chunk borders, keeping only a small tail when one might be split, so
// file parts flow to their destination instead of being collected in memory.
export default async function parseMultipart(
  stream: ReadableStream,
  boundary: string,
  bucket: Bucket | null | undefined | false,
  limits: LimitOptions,
  max: number = INF,
): Promise<Record<string, any>> {
  // Shared by every part, so `maxTotalSize` bounds the request, not each file
  const budget: Budget = { used: 0, max: INF, files: 0 };
  // Every part is preceded by `\r\n--boundary`. Prepend a CRLF so the very first
  // boundary (which has none) matches the same delimiter as the rest.
  const delim = Buffer.from(`\r\n--${boundary}`);
  const body: Record<string, any> = {};
  let buf = Buffer.from("\r\n");
  let state: "boundary" | "headers" | "body" = "boundary";
  let part: Part | null = null;

  // Only text fields are buffered into memory (files stream to the bucket), so
  // only their cumulative size counts against the body limit.
  let textBytes = 0;
  const feed = (p: Part, data: Buffer): Promise<void> => {
    if (p.kind === "text") {
      textBytes += data.length;
      if (textBytes > max) throw tooLarge(max);
    }
    return feedPart(p, data);
  };

  for await (const chunk of asIterable(stream)) {
    buf = Buffer.concat([buf, Buffer.from(chunk)]);

    let advanced = true;
    while (advanced) {
      advanced = false;

      if (state === "boundary") {
        const i = buf.indexOf(delim);
        if (i === -1) {
          // Drop preamble/epilogue, but keep a possible partial delimiter tail
          if (buf.length >= delim.length) {
            buf = buf.subarray(buf.length - delim.length + 1);
          }
          break;
        }
        // Need the two bytes after the delimiter: "--" ends the body, "\r\n"
        // starts the next part's headers.
        if (buf.length < i + delim.length + 2) break;
        const after = i + delim.length;
        if (buf[after] === 0x2d && buf[after + 1] === 0x2d) return body; // "--"
        buf = buf.subarray(after + 2);
        state = "headers";
        advanced = true;
      } else if (state === "headers") {
        const i = buf.indexOf(BREAK);
        if (i === -1) break;
        part = startPart(buf.subarray(0, i).toString("utf-8"), bucket, limits, budget);
        buf = buf.subarray(i + BREAK.length);
        state = "body";
        advanced = true;
      } else {
        const i = buf.indexOf(delim);
        if (i === -1) {
          // No delimiter yet: flush all but the tail that might be a split one
          const safe = buf.length - (delim.length - 1);
          if (safe > 0 && part) {
            await feed(part, buf.subarray(0, safe));
            buf = buf.subarray(safe);
          }
          break;
        }
        if (part) {
          await feed(part, buf.subarray(0, i));
          await endPart(part, body);
          part = null;
        }
        buf = buf.subarray(i); // leave the delimiter for the boundary state
        state = "boundary";
        advanced = true;
      }
    }
  }

  // Tolerate a body that ends without a closing boundary
  if (part) await endPart(part, body);
  return body;
}
