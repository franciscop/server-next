// One or many into a list; nothing into an empty one. For the options that
// accept both a value and an array of values.
export default function toArray<T>(
  value: T | readonly T[] | undefined | null,
): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? ([...value] as T[]) : [value as T];
}
