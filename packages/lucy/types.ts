export type DerivedContainerState<S> = {
  element: S extends Element<infer T> ? DerivedContainerState<T> : never;
  array: S extends Array<infer T> ? Array<DerivedContainerState<T>> : never;
  object: S extends Object
    ? {
        [K in keyof S]: DerivedContainerState<S[K]>;
      }
    : never;
  value: S;
}[S extends Element ? 'element' : S extends Array<any> ? 'array' : S extends Object ? 'object' : 'value'];

export interface Element<S extends any = any> {
  __marker: 'Element';
  key?: string;
  props: any;
  type: Function;
}

export interface MutableRefObject<T> {
  current: T;
}

export interface Singleton<T> {
  id: Symbol;
  initialValue: T;
}

export interface StateSetter<T> {
  (newValue: T): void;
  (newValueSetter: (oldValue: T) => T): void;
}

export type Props<P extends {}> = P & { key?: string };

export interface Container<S = any> {
  readonly state: Readonly<S>;

  onIdle(callback: () => void): void;
  offIdle(callback: () => void): void;
}

export interface LucyEnvironment {
  mode: 'single' | 'continuous';
}

export interface File {
  // should not be persisted
  absolutePath: string;
  path: string;
  hash: string;
}
