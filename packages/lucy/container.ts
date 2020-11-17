import cloneDeepWith from 'lodash/cloneDeepWith';
import { EventEmitter } from 'events';

import { isElement } from './is-element';
import { InternalContainer, Instance } from './internal-types';

function containerToJavascript<S>(container: InternalContainer<S>): S {
  function fromInstance(instance: Instance): any {
    return cloneDeepWith(instance.state, (value, key) => {
      if (isElement(value)) {
        const childInstance = instance.children.get(value.key!);
        if (childInstance) {
          return fromInstance(childInstance);
        }
      }
    });
  }

  return fromInstance(container.root.children.get('')!);
}

export function createContainer<S>(root: Instance): InternalContainer<S> {
  const emitter = new EventEmitter();

  const container: InternalContainer<S> = {
    instancesWithWork: new Set<Instance>([root]),
    root,
    workRegistered: true,

    get state() {
      return containerToJavascript(container);
    },

    onIdle(callback) {
      emitter.on('idle', callback);
    },
    offIdle(callback) {
      emitter.off('idle', callback);
    },
    emitIdle() {
      emitter.emit('idle');
    },
  };

  return container;
}
