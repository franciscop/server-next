// Headers come like [title1, value1, title2, value2, ...]
// https://stackoverflow.com/a/54029307/938236
export default function chunkArray(arr: string[]): [string, string][] {
  return arr.length >= 2 ? [[arr[0], arr[1]], ...chunkArray(arr.slice(2))] : [];
}
