import { Instance } from './internal-types';

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

export interface StateSetter<T> {
  (newValue: T): void;
  (newValueSetter: (oldValue: T) => T): void;
}

export type Props<P extends {}> = P & { key?: string };

export interface Container<S = any> {
  root: Instance;
  readonly state: Readonly<S>;

  instancesWithWork: Set<Instance>;
  workRegistered: boolean;

  onIdle(callback: () => void): void;
  offIdle(callback: () => void): void;
}
