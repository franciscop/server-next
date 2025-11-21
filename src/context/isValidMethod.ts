import type { Method } from "../types";

const methods = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "socket",
];

export default function isValidMethod(method: string): method is Method {
  return methods.includes(method);
}
