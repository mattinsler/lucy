import isPlainObject from 'lodash/isPlainObject';

import { isElement } from './is-element';
import { Container, Element } from './types';
import { InternalContainer, Instance } from './internal-types';

interface InternalInterface {
  current: null | {
    container: InternalContainer;
    instance: Instance;
  };

  createInstance(element: Element): Instance;
  registerMoreWork(opts: { container: Container; instance: Instance }): void;
  work(container: InternalContainer): void;
}

export const Internal: InternalInterface = {
  current: null,

  createInstance({ props, type }: Element) {
    return {
      type,
      props,
      state: null,
      key: '',
      parent: null,
      // depth of node in the tree
      level: 0,
      children: new Map(),
      hooks: [],
      hookCursor: 0,
      executions: 0,
      hasWork: true,
    };
  },

  registerMoreWork({ container, instance }: { container: InternalContainer; instance: Instance }) {
    instance.hasWork = true;
    container.instancesWithWork.add(instance);
    if (!container.workRegistered) {
      container.workRegistered = true;
      process.nextTick(Internal.work, container);
    }
  },

  work(container: InternalContainer) {
    container.workRegistered = false;
    const instances = Array.from(container.instancesWithWork);
    container.instancesWithWork = new Set<Instance>();

    // sort by level in the graph
    instances.sort((l, r) => l.level - r.level);

    // rather than this, find all common roots and process those
    instances.forEach((instance) => {
      if (instance.hasWork) {
        instance.hasWork = false;
        updateInstance({ container, instance });
      }
    });

    if (container.workRegistered) {
      process.nextTick(() => Internal.work(container));
    } else {
      container.emitIdle();
    }
  },
};

function deriveChildren(state: any): Map<string, Element> {
  const children = new Map<string, Element>();

  function traverse(obj: any, keyPath: (string | number)[] = []) {
    if (isElement(obj)) {
      let key = obj.key;
      if (!key) {
        if (obj.props.key && typeof keyPath[keyPath.length - 1] === 'number') {
          obj.key = [...keyPath.slice(0, -1), obj.props.key].join('.');
        } else {
          obj.key = keyPath.join('.');
        }
      }
      children.set(obj.key!, obj);
    } else if (Array.isArray(obj)) {
      obj.forEach((value, idx) => traverse(value, [...keyPath, String(idx)]));
    } else if (isPlainObject(obj)) {
      Object.entries(obj).forEach(([key, value]) => {
        traverse(value, [...keyPath, key]);
      });
    }
  }

  traverse(state);
  return children;
}

function havePropsChanged(prevProps: any, nextProps: any) {
  if (prevProps === nextProps) {
    return false;
  }

  if (isPlainObject(prevProps) !== isPlainObject(nextProps)) {
    return true;
  }

  if (isPlainObject(prevProps)) {
    const prevKeys = Object.keys(prevProps).sort();
    const nextKeys = Object.keys(nextProps).sort();
    if (prevKeys.length === nextKeys.length) {
      if (prevKeys.every((key, idx) => key === nextKeys[idx] && prevProps[key] === nextProps[key])) {
        return false;
      }
    }
  }

  return true;
}

function diffKeys(oldMap: Map<string, unknown>, newMap: Map<string, unknown>): [added: string[], removed: string[]] {
  const added: string[] = [];
  const removed: string[] = [];

  oldMap.forEach((_, oldKey) => {
    if (!newMap.has(oldKey)) {
      removed.push(oldKey);
    }
  });

  newMap.forEach((_, newKey) => {
    if (!oldMap.has(newKey)) {
      added.push(newKey);
    }
  });

  return [added, removed];
}

function updateInstance({ container, instance }: { container: InternalContainer; instance: Instance }) {
  Internal.current = { container, instance };

  instance.hookCursor = 0;
  const state = instance.type(instance.props);
  instance.executions += 1;

  const children = deriveChildren(state);

  const [added, removed] = diffKeys(instance.children, children);

  // remove children
  // removed.forEach((key) => {
  //   // trigger useEffect onUnmount...
  //   instance.children.get(key)!
  // });

  // change child elements to child instances, creating as necessary
  const nextChildren = new Map<string, Instance>();

  children.forEach((child, key) => {
    let childInstance;

    if (instance.children.has(key)) {
      childInstance = instance.children.get(key)!;

      // update props and determine whether a render is necessary
      if (havePropsChanged(childInstance.props, child.props)) {
        childInstance.props = child.props;
        childInstance.hasWork = true;
      }
    } else {
      // create new instance
      childInstance = Internal.createInstance(child);
      childInstance.key = key;
      childInstance.parent = instance;
      childInstance.level = instance.level + 1;
    }

    nextChildren.set(key, childInstance);
  });

  instance.children = nextChildren;

  // probably don't use propsHash for add/remove.. only key
  // new instance creation can be controlled by making the user specify a key
  // props hashing or just reference checking of top-level keys can determine when to re-render
  // issue with whether children should re-render because props and children can be the same in this case...
  // maybe we just never let an element be passed as a prop? that could neaten this up a bit...
  // then you only need to look at props change to determine whether a re-render is necessary

  // reconcile children...
  // check for add/remove children by propsHash
  // destroy child instances for removed children
  // create child instances for added children

  // check if state changed and mark if so (shouldComponentUpdate / commit)
  instance.state = state;

  // update children
  // instance.children.forEach((child) => child.hasWork && updateInstance({ container, instance: child }));
  instance.children.forEach((child) => child.hasWork && Internal.registerMoreWork({ container, instance: child }));
}
