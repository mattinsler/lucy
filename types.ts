import { Instance } from './internal-types';

export interface Element {
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

export interface Container {
  toJSON(): any;

  root: Instance;

  instancesWithWork: Set<Instance>;
  workRegistered: boolean;
}
