import type { PartFailure, PartTrace } from './types';

export function okTrace(id: string, html: string, ms: number): PartTrace {
  return {
    id,
    status: html === '' ? 'empty' : 'ok',
    html,
    chars: html.length,
    ms,
  };
}

export function skippedTrace(id: string): PartTrace {
  return { id, status: 'skipped', html: '', chars: 0, ms: 0 };
}

export function describeError(error: unknown): PartFailure {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: 'Error', message: String(error) };
}

/** Freeze the rows a caller may store while other templates keep rendering. */
export function publish(trace: PartTrace[]): readonly PartTrace[] {
  for (const part of trace) {
    if (part.error !== undefined) Object.freeze(part.error);
    Object.freeze(part);
  }
  return Object.freeze(trace);
}
