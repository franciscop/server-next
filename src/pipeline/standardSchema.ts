// The Standard Schema protocol (https://standardschema.dev), vendored since
// it's a types-only spec: any library implementing `~standard` (zod, valibot,
// arktype, ...) can be a route schema. `validate` returns the validated value
// or the issues; it never throws, and it may be async.
export type StandardIssue = {
  readonly message: string;
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[];
};

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) =>
      | { value: Output; issues?: undefined }
      | { issues: readonly StandardIssue[] }
      | Promise<
          | { value: Output; issues?: undefined }
          | { issues: readonly StandardIssue[] }
        >;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}

// The validated type a schema produces, or the fallback without one. The
// brackets keep the conditional from distributing: an absent schema is
// `StandardSchemaV1 | undefined`, which must resolve to the fallback whole.
export type SchemaOutput<S, Fallback> = [S] extends [
  StandardSchemaV1<any, infer Output>,
]
  ? Output
  : Fallback;
