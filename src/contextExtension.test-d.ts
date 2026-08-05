// Compile-time only: apps type the fields their middleware adds to `ctx` by
// augmenting `ContextExtension`, and this file both documents and enforces
// that. It augments the interface exactly as an app would, then asserts the
// field lands on `Context`. Dropping the `& ContextExtension` from `Context`
// makes this file stop compiling.
//
// No test runner needed: `tsc --noEmit` (run by `npm test` / `npm run lint`)
// fails it the same as any other type error.
//
// The augmentation is global to this compilation, so the field is optional and
// named to make clear it's a fixture.
import type { Context } from "./types";

declare module "./types" {
  interface ContextExtension {
    typeTestProject?: { name: string };
  }
}

declare const ctx: Context;

// The app-added field is typed
const _added: string | undefined = ctx.typeTestProject?.name;

// ...and the framework's own fields still are, which is the point of doing
// this instead of annotating the handler `any`
const _param: string = ctx.url.params.slug;
const _method: string = ctx.method;
const _email: string | undefined = ctx.user?.email;

// A typo is still caught, rather than silently becoming `any`
// @ts-expect-error `typeTestProjekt` is not a field on Context
ctx.typeTestProjekt;

export type { _added as added, _param as param, _method as method, _email as email };
