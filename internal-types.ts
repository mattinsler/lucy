import { StateSetter } from './types';

export interface EffectHookState {
  type: 'effect';
  deps: any[];
}
export interface StateHookState {
  type: 'state';
  setState: StateSetter<any>;
  state: any;
}
export type HookState = EffectHookState | StateHookState;

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
