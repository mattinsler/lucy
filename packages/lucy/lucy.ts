import isEqual from 'lodash/isEqual';

import { Internal } from './internal';
import { StateHookState } from './internal-types';
import { Element, Props, StateSetter } from './types';

interface LucyInterface {
  create<P extends {}>(type: (props: P) => any, props: Props<P>): Element;
  useEffect(fn: () => void, deps?: any[]): void;
  useState<T>(initialValue?: T | (() => T)): [T, StateSetter<T>];
}

export const Lucy: LucyInterface = {
  create(type, props) {
    return {
      __marker: 'Element',
      key: props.key,
      props,
      type,
    };
  },

  useEffect(fn, deps = []) {
    if (Internal.current === null) {
      throw new Error();
    }

    const { instance } = Internal.current!;

    if (instance.executions === 0) {
      instance.hooks[instance.hookCursor] = {
        type: 'effect',
        deps: [Symbol('initial')],
      };
    }

    const hook = instance.hooks[instance.hookCursor];

    if (!hook || hook.type !== 'effect') {
      throw new Error();
    }

    const oldDeps = hook.deps;
    if (!isEqual(oldDeps, deps)) {
      fn();
      hook.deps = deps;
    }

    instance.hookCursor += 1;
  },

  useState(initialState) {
    if (Internal.current === null) {
      throw new Error();
    }

    const { container, instance } = Internal.current!;

    function createSetter(cursor: number) {
      return function (nextState: any) {
        let newState;
        const oldState = (instance.hooks[cursor] as StateHookState).state;
        newState = typeof nextState === 'function' ? nextState(oldState) : nextState;

        if (newState !== oldState) {
          (instance.hooks[cursor] as StateHookState).state = newState;
          Internal.registerMoreWork({ container, instance });
        }
      };
    }

    if (instance.executions === 0) {
      instance.hooks[instance.hookCursor] = {
        type: 'state',
        setState: createSetter(instance.hookCursor),
        state: typeof initialState === 'function' ? (initialState as Function)() : initialState,
      } as StateHookState;
    } else if (!instance.hooks[instance.hookCursor] || instance.hooks[instance.hookCursor].type !== 'state') {
      throw new Error();
    }

    const hook = instance.hooks[instance.hookCursor];

    if (!hook || hook.type !== 'state') {
      throw new Error();
    }

    instance.hookCursor += 1;
    return [hook.state, hook.setState];
  },
};
