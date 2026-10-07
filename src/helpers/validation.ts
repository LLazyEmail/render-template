import { RenderError } from '../errors';
import type { Template, TemplatePart } from '../types';

export const RESERVED_PART_ID = 'compose';

export function assertTemplate<TProps>(template: Template<TProps>): void {
  if (template.id === '') {
    throw new RenderError('template id is empty', {
      templateId: '',
      partId: 'template',
      trace: [],
    });
  }
  const seen = new Set<string>();
  for (const part of template.parts) {
    assertPart(template.id, part, seen);
  }
  if (typeof template.compose !== 'function') {
    throw new RenderError(`template "${template.id}" is missing compose`, {
      templateId: template.id,
      partId: 'template',
      trace: [],
    });
  }
}

function assertPart<TProps>(
  templateId: string,
  part: TemplatePart<TProps>,
  seen: Set<string>,
): void {
  if (part.id === '') {
    throw new RenderError(`template "${templateId}" has an empty part id`, {
      templateId,
      partId: 'template',
      trace: [],
    });
  }
  if (part.id === RESERVED_PART_ID) {
    throw new RenderError(`part id "${RESERVED_PART_ID}" is reserved`, {
      templateId,
      partId: 'template',
      trace: [],
    });
  }
  if (seen.has(part.id)) {
    throw new RenderError(`duplicate part id "${part.id}"`, {
      templateId,
      partId: 'template',
      trace: [],
    });
  }
  seen.add(part.id);
}
