import { Lucy } from './lucy';
import { Internal } from './internal';
import { createContainer } from './container';
import { Container, DerivedContainerState, Element, LucyEnvironment } from './types';

interface RenderOptions {
  continuous?: boolean;
}

function Root({ child }: { child: Element }) {
  return child;
}

export function render<S>(element: Element<S>, options: RenderOptions = {}): Container<DerivedContainerState<S>> {
  const root = Internal.createInstance(Lucy.create(Root, { child: element, options }));
  const container = createContainer<DerivedContainerState<S>>(root);

  container.LucyEnvironmentSingleton = Lucy.createSingleton<LucyEnvironment>({
    mode: options.continuous === true ? 'continuous' : 'single',
  });

  Internal.work(container);

  return container;
}
