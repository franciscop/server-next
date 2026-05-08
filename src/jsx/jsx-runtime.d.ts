export declare function jsx(type: any, props: any, key?: any): any;
export declare function jsxs(type: any, props: any, key?: any): any;
export declare function jsxDEV(type: any, props: any, key?: any): any;
export declare const Fragment: unique symbol;

export declare namespace JSX {
  interface Element {
    type: any;
    props: any;
  }
  interface IntrinsicElements {
    [elem: string]: any;
  }
}

declare global {
  namespace JSX {
    interface Element {
      type: any;
      props: any;
    }
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
