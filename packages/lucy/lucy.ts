import isEqual from 'lodash/isEqual';

import { Internal } from './internal';
import { Instance, InternalContainer } from './internal-types';
import { Element, MutableRefObject, Props, Singleton, StateSetter } from './types';

function createHook<R, S>(
  hookType: string,
  init: (context: { container: InternalContainer; instance: Instance }) => S,
  execute: (state: S, context: { container: InternalContainer; instance: Instance }) => R
): R {
  if (Internal.current === null) {
    throw new Error('Hooks can only be called from within an element or a custom hook.');
  }

  const { container, instance } = Internal.current!;

  if (instance.executions === 0) {
    const state = init({ container, instance });
    instance.hooks[instance.hookCursor] = {
      type: hookType,
      state,
    };
  }

  const hook = instance.hooks[instance.hookCursor];

  if (!hook || hook.type !== hookType) {
    throw new Error('Hooks must be called in the same order every time and cannot be called within an if block.');
  }

  const result = execute(instance.hooks[instance.hookCursor].state, { container, instance });

  instance.hookCursor += 1;
  return result;
}

function create<P extends {}, S extends any>(type: (props: Props<P>) => S, props: Props<P>): Element<S> {
  return {
    __marker: 'Element',
    key: props.key,
    props,
    type,
  };
}

function createSingleton<T>(initialState?: T | (() => T)): Singleton<T> {
  return {
    id: Symbol('lucy singleton'),
    initialValue: typeof initialState === 'function' ? (initialState as Function)() : initialState,
  };
}

function useSingleton<T>(singleton: Singleton<T>): T {
  return createHook(
    'singleton',
    () => singleton,
    ({ id, initialValue }, { container }) => {
      if (!container.singletons.has(id)) {
        container.singletons.set(id, initialValue);
      }
      return container.singletons.get(id);
    }
  );
}

function useNamedSingleton<T>(name: string, createIfNotExist: () => T): T {
  return createHook(
    'singleton',
    () => ({ name }),
    ({ name }, { container }) => {
      if (!container.singletons.has(name)) {
        container.singletons.set(name, createIfNotExist());
      }
      return container.singletons.get(name);
    }
  );
}

function useEffect(fn: () => void, deps: any[] = []): void {
  createHook(
    'effect',
    () => ({ deps: [Symbol('initial')] }),
    (state) => {
      const oldDeps = state.deps;
      if (!isEqual(oldDeps, deps)) {
        fn();
        state.deps = deps;
      }
    }
  );
}

function useRef<T>(initialState?: T | (() => T)): MutableRefObject<T> {
  return createHook(
    'ref',
    () => ({ current: typeof initialState === 'function' ? (initialState as Function)() : initialState }),
    ({ current }) => ({ current })
  );
}

function useState<T>(
  initialState?: T | (() => T),
  isEqual?: (oldState: T, newState: T) => boolean
): [state: T, setState: StateSetter<T>, triggerChange: () => void] {
  if (!isEqual) {
    isEqual = (oldState: T, newState: T): boolean => {
      return oldState === newState;
    };
  }

  return createHook(
    'state',
    ({ container, instance }) => {
      function triggerChange() {
        Internal.registerMoreWork({ container, instance });
      }

      function createSetState(cursor: number) {
        return (nextState: any) => {
          const oldState = instance.hooks[cursor].state.state;
          const newState = typeof nextState === 'function' ? nextState(oldState) : nextState;

          if (!isEqual!(oldState, newState)) {
            instance.hooks[cursor].state.state = newState;
            triggerChange();
          }
        };
      }

      return {
        setState: createSetState(instance.hookCursor),
        state: typeof initialState === 'function' ? (initialState as Function)() : initialState,
        triggerChange,
      };
    },
    ({ setState, state, triggerChange }) => {
      return [state, setState, triggerChange];
    }
  );
}

function useLucyEnvironment() {
  if (Internal.current === null) {
    throw new Error('Hooks can only be called from within an element or a custom hook.');
  }

  if (!Internal.current.container.LucyEnvironmentSingleton) {
    throw new Error('Hooks can only be called from within an element or a custom hook.');
  }

  return useSingleton(Internal.current.container.LucyEnvironmentSingleton);
}

export const Lucy = {
  create,
  createSingleton,
  useEffect,
  useLucyEnvironment,
  useNamedSingleton,
  useRef,
  useSingleton,
  useState,
};
