import lodash from 'lodash';

import { isElement } from './is-element';
import { Instance } from './internal-types';
import { Container } from './types';

function containerToJavascript<S>(container: Container<S>): S {
  function fromInstance(instance: Instance): any {
    return lodash.cloneDeepWith(instance.state, (value, key) => {
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

export function createContainer<S>(root: Instance): Container<S> {
  const container: Container<S> = {
    instancesWithWork: new Set<Instance>([root]),
    root,
    workRegistered: true,

    get state() {
      return containerToJavascript(container);
    },
  };

  return container;
}
