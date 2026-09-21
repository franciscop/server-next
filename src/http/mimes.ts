import { mimes as base } from "bucket";

// `bucket` maps extensions to types for the files it stores, and that is the
// same table an HTTP response needs, so there is no second list here. The one
// difference is the charset: a stored file's type does not carry one, and a
// text response must say utf-8 or the browser guesses.
const mimes: Record<string, string> = {};
for (const ext in base) {
  const type = base[ext];
  mimes[ext] = type.startsWith("text/") ? `${type}; charset=utf-8` : type;
}

export default mimes;

// The MIME for a path or filename, from its extension; undefined when there
// is no extension or it is not in the table.
export const mimeOf = (path: string): string | undefined => {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext ? mimes[ext] : undefined;
};
