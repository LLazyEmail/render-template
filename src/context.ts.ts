import type { RenderContext, SlotValue } from './types';

export function createContext<TProps>(
  templateId: string,
  props: TProps,
  slots: Readonly<Record<string, SlotValue<TProps>>> | undefined,
): RenderContext<TProps> {
  return {
    templateId,
    props,
    slots: Object.freeze({ ...(slots ?? {}) }),
  };
}