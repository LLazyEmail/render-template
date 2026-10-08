import type { RenderJob, RenderOptions, RenderResult } from '../types';
import { renderTemplate } from './render';

/**
 * Render many templates. Use `onError: 'collect'` so one broken template
 * does not stop the batch. The default is `throw`, which skips later jobs.
 */
export function renderMany<TProps>(
  jobs: readonly RenderJob<TProps>[],
  options?: Pick<RenderOptions<TProps>, 'onError'>,
): RenderResult[] {
  return jobs.map((job) => renderTemplate(job.template, propsOf(job), optionsFor(job, options)));
}

function propsOf<TProps>(job: RenderJob<TProps>): TProps {
  return job.props === undefined ? ({} as TProps) : job.props;
}

function optionsFor<TProps>(
  job: RenderJob<TProps>,
  options: Pick<RenderOptions<TProps>, 'onError'> | undefined,
): RenderOptions<TProps> {
  const next: RenderOptions<TProps> = {};
  if (options?.onError !== undefined) next.onError = options.onError;
  if (job.slots !== undefined) next.slots = job.slots;
  return next;
}
