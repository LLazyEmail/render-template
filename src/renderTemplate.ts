import { createContext } from './helpers/context';
import { RenderError } from './errors';
import { normalizeHtml } from './helpers/html';
import { describeError, okTrace, publish, skippedTrace } from './helpers/trace';
import type {
  ErrorMode,
  PartFailure,
  PartTrace,
  RenderContext,
  RenderOptions,
  RenderResult,
  Template,
  TemplatePart,
} from './types';
import { RESERVED_PART_ID, assertTemplate } from './helpers/validation';

/**
 * Render one template. The same template and props produce the same HTML.
 * The runtime keeps no state between calls.
 *
 * Each part is attempted in order. In `throw` mode the first failure stops
 * the run and later parts are marked skipped. In `collect` mode the run
 * continues, then compose either returns HTML or a compose error.
 */
export function renderTemplate<TProps>(
  template: Template<TProps>,
  props: TProps,
  options: RenderOptions<TProps> = {},
): RenderResult {
  assertTemplate(template);

  const onError = options.onError ?? 'throw';
  const ctx = createContext(template.id, props, options.slots);
  const rendered: Record<string, string> = {};
  const trace: PartTrace[] = [];
  let ok = true;

  for (const [index, part] of template.parts.entries()) {
    const attempt = tryPart(part, ctx);
    rendered[part.id] = attempt.html;
    trace.push(attempt.row);

    if (attempt.failed === false) continue;

    ok = false;
    if (onError === 'throw') {
      markRestSkipped(trace, template.parts.slice(index + 1));
      throw partFailed(template.id, part.id, attempt.failure.message, trace, attempt.cause);
    }
  }

  return finish(template, ctx, rendered, trace, ok, onError);
}

/** Compose the part HTML, or record/throw the compose failure. */
export function finish<TProps>(
  template: Template<TProps>,
  ctx: RenderContext<TProps>,
  rendered: Record<string, string>,
  trace: PartTrace[],
  ok: boolean,
  onError: ErrorMode,
): RenderResult {
  try {
    return {
      templateId: template.id,
      ok,
      html: composeHtml(template, rendered, ctx),
      parts: publish(trace),
    };
  } catch (cause) {
    return composeFailed(template.id, trace, cause, onError);
  }
}

interface PartAttempt {
  html: string;
  row: PartTrace;
  failed: boolean;
  failure: PartFailure;
  cause: unknown;
}

function tryPart<TProps>(part: TemplatePart<TProps>, ctx: RenderContext<TProps>): PartAttempt {
  const started = Date.now();
  try {
    const html = normalizeHtml(part.id, part.render(ctx));
    return {
      html,
      row: okTrace(part.id, html, elapsed(started)),
      failed: false,
      failure: { name: '', message: '' },
      cause: undefined,
    };
  } catch (cause) {
    const failure = describeError(cause);
    return {
      html: '',
      row: errorRow(part.id, failure, elapsed(started)),
      failed: true,
      failure,
      cause,
    };
  }
}

function markRestSkipped<TProps>(trace: PartTrace[], rest: readonly TemplatePart<TProps>[]): void {
  for (const part of rest) trace.push(skippedTrace(part.id));
}

function partFailed(
  templateId: string,
  partId: string,
  message: string,
  trace: PartTrace[],
  cause: unknown,
): RenderError {
  return new RenderError(`template "${templateId}" failed at part "${partId}": ${message}`, {
    templateId,
    partId,
    trace: publish(trace),
    cause,
  });
}

function composeHtml<TProps>(
  template: Template<TProps>,
  rendered: Record<string, string>,
  ctx: RenderContext<TProps>,
): string {
  const html = template.compose(rendered, ctx);
  if (typeof html !== 'string') {
    throw new TypeError(`compose returned ${typeof html}, expected a string`);
  }
  return html;
}

function composeFailed(
  templateId: string,
  trace: PartTrace[],
  cause: unknown,
  onError: ErrorMode,
): RenderResult {
  const failure = describeError(cause);
  if (onError === 'collect') {
    return {
      templateId,
      ok: false,
      html: '',
      parts: publish(trace),
      composeError: failure,
    };
  }
  throw new RenderError(`template "${templateId}" failed at part "compose": ${failure.message}`, {
    templateId,
    partId: RESERVED_PART_ID,
    trace: publish(trace),
    cause,
  });
}

function errorRow(id: string, failure: PartFailure, ms: number): PartTrace {
  return { id, status: 'error', html: '', chars: 0, ms, error: failure };
}

function elapsed(started: number): number {
  return Date.now() - started;
}
