import { Lucy } from './lucy';
import { Internal } from './internal';
import { createContainer } from './container';
import { Container, DerivedContainerState, Element } from './types';

function Root({ child }: { child: Element }) {
  return child;
}

export function render<S>(element: Element<S>): Container<DerivedContainerState<S>> {
  const root = Internal.createInstance(Lucy.create(Root, { child: element }));
  const container = createContainer<DerivedContainerState<S>>(root);

  Internal.work(container);

  return container;
}
