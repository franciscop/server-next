// The one enforcement point for "explicit always wins": a header already set
// by the route (or an earlier step) is never overwritten, and empty values
// set nothing.
export default function setIfAbsent(
  headers: Headers,
  key: string,
  value?: string | null,
): void {
  if (value && !headers.has(key)) headers.set(key, value);
}
