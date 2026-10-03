/** A named, self-contained HTML fragment produced from a render context. */
export interface TemplatePart<TProps> {
  readonly id: string;
  render(ctx: RenderContext<TProps>): string | null | undefined;
}

/** A template is a list of parts plus a compose step. */
export interface Template<TProps> {
  readonly id: string;
  readonly parts: readonly TemplatePart<TProps>[];
  compose(rendered: Readonly<Record<string, string>>, ctx: RenderContext<TProps>): string;
}

/** Immutable context handed to every part and to compose. */
export interface RenderContext<TProps> {
  readonly templateId: string;
  readonly props: TProps;
  readonly slots: Readonly<Record<string, SlotValue<TProps>>>;
}

/** A slot is either a static string or a function evaluated against the context. */
export type SlotValue<TProps> = string | ((ctx: RenderContext<TProps>) => string | null | undefined);

export type ErrorMode = 'throw' | 'collect';

export interface RenderOptions<TProps> {
  onError?: ErrorMode;
  slots?: Readonly<Record<string, SlotValue<TProps>>>;
}

export interface RenderJob<TProps> {
  template: Template<TProps>;
  props?: TProps;
  slots?: Readonly<Record<string, SlotValue<TProps>>>;
}

export interface PartFailure {
  name: string;
  message: string;
}

export type PartStatus = 'ok' | 'empty' | 'error' | 'skipped';

export interface PartTrace {
  id: string;
  status: PartStatus;
  html: string;
  chars: number;
  ms: number;
  error?: PartFailure;
}

export interface RenderResult {
  templateId: string;
  ok: boolean;
  html: string;
  parts: readonly PartTrace[];
  composeError?: PartFailure;
}
