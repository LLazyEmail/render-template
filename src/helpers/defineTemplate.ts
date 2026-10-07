import type { Template } from '../types';
import { assertTemplate } from './validation';

/**
 * Validate, copy, and freeze a template. Later edits to the caller's part
 * array do not change a template that has already been defined.
 */
export function defineTemplate<TProps>(template: Template<TProps>): Template<TProps> {
  assertTemplate(template);
  return Object.freeze({
    id: template.id,
    parts: Object.freeze(
      template.parts.map((part) => Object.freeze({ id: part.id, render: part.render })),
    ),
    compose: template.compose,
  });
}
