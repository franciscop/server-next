// What a JSX tag can be: an intrinsic name, a Fragment, a function component,
// or an object exposing `render` (the shape forwardRef-style components take)
type Tag =
  | string
  | symbol
  | ((props: any) => unknown)
  | { render: (props: any, ref: unknown) => unknown };

export declare function jsx(
  type: Tag,
  props?: any,
  key?: string | number,
): JSX.Element;
export declare function jsxs(
  type: Tag,
  props?: any,
  key?: string | number,
): JSX.Element;
export declare function jsxDEV(
  type: Tag,
  props?: any,
  key?: string | number,
): JSX.Element;
export declare const Fragment: symbol;

export declare namespace JSX {
  interface Element {
    (): string;
  }
  interface IntrinsicElements {
    [elem: string]: any;
  }
}

declare global {
  namespace JSX {
    interface Element {
      (): string;
    }
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
