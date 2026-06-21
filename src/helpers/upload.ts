import type { Bucket, UploadedFile } from "../types";
import createId from "./createId";

export type LimitOptions = {
  maxSize?: number | string;
  minSize?: number | string;
  fileType?: string[];
};

function parseBytes(value: number | string): number {
  if (typeof value === "number") return value;
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
  };
  const match = value.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  if (!match) throw new Error(`Invalid size: "${value}"`);
  return parseFloat(match[1]) * (units[match[2]] ?? 1);
}

// Returns the lowercase extension including the leading dot, e.g. ".jpg".
// Falls back to ".bin" for files with no extension or dotfiles.
export function getExt(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i <= 0) return ".bin";
  return filename.slice(i).toLowerCase();
}

export async function saveFileToBucket(
  originalName: string,
  data: Buffer,
  bucket: Bucket,
  contentType: string,
): Promise<UploadedFile> {
  const ext = getExt(originalName);
  const id = `${createId()}${ext}`;
  const path = (await bucket.write(id, data)) as string;
  return { name: originalName, id, path, type: contentType, size: data.length };
}

export class UploadPipeline {
  private _bucket: Bucket | null;
  private _limits: LimitOptions = {};

  constructor(bucket?: Bucket | null) {
    this._bucket = bucket ?? null;
  }

  limit(options: LimitOptions): this {
    this._limits = { ...this._limits, ...options };
    return this;
  }

  store(bucket: Bucket): this {
    this._bucket = bucket;
    return this;
  }

  async processFile(
    originalName: string,
    data: Buffer,
    contentType: string,
  ): Promise<UploadedFile> {
    const { maxSize, minSize, fileType } = this._limits;

    if (maxSize !== undefined && data.length > parseBytes(maxSize)) {
      throw new Error(
        `File "${originalName}" is too large (${data.length} bytes, limit is ${maxSize})`,
      );
    }

    if (minSize !== undefined && data.length < parseBytes(minSize)) {
      throw new Error(
        `File "${originalName}" is too small (${data.length} bytes, minimum is ${minSize})`,
      );
    }

    if (fileType && fileType.length > 0) {
      const ext = getExt(originalName);
      const mime = contentType.toLowerCase();
      const allowed = fileType.some(
        (t) => t.toLowerCase() === mime || t.toLowerCase() === ext,
      );
      if (!allowed) {
        throw new Error(
          `File type not allowed for "${originalName}" (got "${contentType}", allowed: ${fileType.join(", ")})`,
        );
      }
    }

    if (!this._bucket) {
      throw new Error(
        `No destination configured. Pass a bucket to upload() or call .store()`,
      );
    }

    return saveFileToBucket(originalName, data, this._bucket, contentType);
  }
}

export default function upload(bucket?: Bucket | null): UploadPipeline {
  return new UploadPipeline(bucket);
}
