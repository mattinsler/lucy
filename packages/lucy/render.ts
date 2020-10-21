import lodash from 'lodash';

import { Lucy } from './lucy';
import { Internal } from './internal';
import { isElement } from './is-element';
import { Instance } from './internal-types';
import { Container, Element } from './types';

function Root({ child }: { child: Element }) {
  return child;
}

export function render(element: Element): Container {
  const root = Internal.createInstance(Lucy.create(Root, { child: element }));

  const container: Container = {
    instancesWithWork: new Set<Instance>([root]),
    root,
    workRegistered: true,

    toJSON() {
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
    },
  };

  Internal.work(container);

  return container;
}
