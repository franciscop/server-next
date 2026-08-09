import StatusError from "../helpers/StatusError";
import type { StandardIssue } from "../types";

// A schema rejected the request (422) or the response (500). The `message` is
// what the default onError sends to the client, so it stays generic on
// purpose: the field names and schema messages live in `issues`, for a custom
// onError to log or shape into an API error response.
export default class ValidationError extends StatusError {
  source: "body" | "query" | "params" | "response";
  issues: readonly StandardIssue[];

  constructor(
    source: "body" | "query" | "params" | "response",
    issues: readonly StandardIssue[],
  ) {
    if (source === "response") {
      // A response breaking its own contract is a server bug, not client input
      super("Server Error", 500);
    } else {
      super(`Invalid request ${source}`, 422);
    }
    this.source = source;
    this.issues = issues;
  }
}
