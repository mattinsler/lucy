import { Container, LucyEnvironment, Singleton } from './types';

export interface HookState {
  type: string;
  state: any;
}

export interface Instance {
  type: Function;
  props: any;
  state: any;
  key: string;
  parent: null | Instance;
  level: number;
  children: Map<string, Instance>;
  hooks: HookState[];
  hookCursor: number;
  executions: number;
  hasWork: boolean;
}

export interface InternalContainer<S = any> extends Container<S> {
  root: Instance;

  instancesWithWork: Set<Instance>;
  workRegistered: boolean;

  LucyEnvironmentSingleton?: Singleton<LucyEnvironment>;
  singletons: Map<string | Symbol, any>;

  emitIdle(): void;
}
