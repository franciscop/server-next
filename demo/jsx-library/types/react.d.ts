// The React type surface third-party component libraries import, expressed in
// terms of Server's JSX. This is the equivalent of preact/compat's React
// types: the runtime is aliased in package.json, the types are aliased here
// through `paths` in tsconfig.json.
//
// Add to it as libraries ask for more; everything here is types only, nothing
// ships at runtime.

export type ReactElement = JSX.Element;
export type ReactNode =
  | JSX.Element
  | string
  | number
  | boolean
  | null
  | undefined
  | Iterable<ReactNode>;

export type Key = string | number;
export type Ref<T> = ((instance: T | null) => void) | { current: T | null };

// Intrinsic props are open here, the same way JSX.IntrinsicElements is
export interface HTMLAttributes<T = unknown> {
  [attribute: string]: any;
}
export interface SVGAttributes<T = unknown> extends HTMLAttributes<T> {}
export type CSSProperties = Record<string, string | number>;

export type FC<P = {}> = (props: P & { children?: ReactNode }) => JSX.Element;
export type FunctionComponent<P = {}> = FC<P>;
export type ComponentType<P = {}> = FC<P>;
