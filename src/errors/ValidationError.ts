import ServerError, { definition } from "./index";
import type { StandardIssue } from "../types";

// A schema rejected the request (422) or the response (500). The `message` is
// what the default onError sends to the client, so it stays generic on
// purpose: the field names and schema messages live in `issues`, for a custom
// onError to log or shape into an API error response.
export default class ValidationError extends ServerError {
  source: "body" | "query" | "params" | "response";
  issues: readonly StandardIssue[];

  constructor(
    source: "body" | "query" | "params" | "response",
    issues: readonly StandardIssue[],
  ) {
    // A response breaking its own contract is a server bug, not client input
    const code = source === "response" ? "VALIDATION_FAILED" : "INVALID_REQUEST";
    const { status, message } = definition(code)!;
    super(code, status, message, { source });
    this.source = source;
    this.issues = issues;
  }
}
