import { createContext } from './context';
import { RenderError } from './errors';
import { normalizeHtml } from './html';
import { describeError, okTrace, publish, skippedTrace } from './trace';
import type {
  PartTrace,
  RenderContext,
  RenderOptions,
  RenderResult,
  Template,
} from './types';
import { RESERVED_PART_ID, assertTemplate } from './validation';

/**
 * Render one template. The same template and props produce the same HTML.
 * The runtime keeps no state between calls.
 */
export function renderTemplate<TProps>(
  template: Template<TProps>,
  props: TProps,
  options: RenderOptions<TProps> = {},
): RenderResult {
  assertTemplate(template);
  const onError = options.onError ?? 'throw';
  const ctx = createContext(template.id, props, options.slots);
  const trace: PartTrace[] = [];
  const rendered: Record<string, string> = {};
  let ok = true;

  for (const [index, part] of template.parts.entries()) {
    const started = Date.now();
    try {
      const html = normalizeHtml(part.id, part.render(ctx));
      rendered[part.id] = html;
      trace.push(okTrace(part.id, html, Date.now() - started));
    } catch (error) {
      ok = false;
      const failure = describeError(error);
      rendered[part.id] = '';
      trace.push({
        id: part.id,
        status: 'error',
        html: '',
        chars: 0,
        ms: Date.now() - started,
        error: failure,
      });
      if (onError === 'throw') {
        for (const later of template.parts.slice(index + 1)) {
          trace.push(skippedTrace(later.id));
        }
        throw new RenderError(
          `template "${template.id}" failed at part "${part.id}": ${failure.message}`,
          {
            templateId: template.id,
            partId: part.id,
            trace: publish(trace),
            cause: error,
          },
        );
      }
    }
  }

  return finish(template, ctx, rendered, trace, ok, onError);
}

function finish<TProps>(
  template: Template<TProps>,
  ctx: RenderContext<TProps>,
  rendered: Record<string, string>,
  trace: PartTrace[],
  ok: boolean,
  onError: 'throw' | 'collect',
): RenderResult {
  try {
    const html = template.compose(rendered, ctx);
    if (typeof html !== 'string') {
      throw new TypeError(`compose returned ${typeof html}, expected a string`);
    }
    return { templateId: template.id, ok, html, parts: publish(trace) };
  } catch (error) {
    const failure = describeError(error);
    if (onError === 'collect') {
      return {
        templateId: template.id,
        ok: false,
        html: '',
        parts: publish(trace),
        composeError: failure,
      };
    }
    throw new RenderError(
      `template "${template.id}" failed at part "compose": ${failure.message}`,
      {
        templateId: template.id,
        partId: RESERVED_PART_ID,
        trace: publish(trace),
        cause: error,
      },
    );
  }
}