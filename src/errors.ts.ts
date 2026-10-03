import type { PartTrace } from './types';

/** Thrown when a template definition is invalid or a part breaks in `throw` mode. */
export class RenderError extends Error {
  readonly templateId: string;
  readonly partId: string;
  readonly trace: readonly PartTrace[];

  constructor(
    message: string,
    details: {
      templateId: string;
      partId: string;
      trace: readonly PartTrace[];
      cause?: unknown;
    },
  ) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = 'RenderError';
    this.templateId = details.templateId;
    this.partId = details.partId;
    this.trace = details.trace;
  }
}