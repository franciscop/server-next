export default function isReadableStream(obj) {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof obj.pipe === "function" &&
    typeof obj.read === "function" &&
    typeof obj.on === "function"
  );
}
