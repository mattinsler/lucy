import { Element } from './types';

export function isElement(value: any): value is Element {
  return value && (value as Element).__marker === 'Element';
}
