import { RenderError } from '../errors';
import type { RenderContext } from '../types';

/** True when the caller passed this slot, including an empty string. */
export function hasSlot<TProps>(ctx: RenderContext<TProps>, id: string): boolean {
  return Object.hasOwn(ctx.slots, id);
}

/** Read a slot. A missing slot is `''`. A function slot is called with the same context. */
export function slot<TProps>(ctx: RenderContext<TProps>, id: string): string {
  if (!hasSlot(ctx, id)) return '';
  const value = ctx.slots[id];
  if (typeof value === 'function') {
    const html = value(ctx);
    if (html == null) return '';
    if (typeof html !== 'string') {
      throw new RenderError(`slot "${id}" returned ${typeof html}`, {
        templateId: ctx.templateId,
        partId: id,
        trace: [],
      });
    }
    return html;
  }
  if (typeof value === 'string') return value;
  throw new RenderError(`slot "${id}" is ${value === null ? 'null' : typeof value}`, {
    templateId: ctx.templateId,
    partId: id,
    trace: [],
  });
}
