import { describe, expect, it } from 'vitest';
import {
  defineTemplate,
  hasSlot,
  renderTemplate,
  slot,
  RenderError,
  type RenderContext,
  type Template,
  type TemplatePart,
} from '../src';

interface Props {
  name: string;
}

function makeTemplate(overrides: Partial<Template<Props>> = {}): Template<Props> {
  return {
    id: 'welcome',
    parts: [
      {
        id: 'greeting',
        render: (ctx) => `<h1>Hello, ${ctx.props.name}</h1>`,
      },
      {
        id: 'body',
        render: () => `<p>Welcome aboard.</p>`,
      },
    ],
    compose: (rendered) => (rendered.greeting ?? '') + (rendered.body ?? ''),
    ...overrides,
  };
}

function parts(
  list: readonly TemplatePart<Props>[],
  compose?: Template<Props>['compose'],
  id = 'demo',
): Template<Props> {
  return defineTemplate({
    id,
    parts: list,
    compose: compose ?? ((rendered) => list.map((part) => rendered[part.id] ?? '').join('|')),
  });
}

describe('renderTemplate', () => {
  it('renders a single part', () => {
    const result = renderTemplate(
      parts([{ id: 'only', render: (ctx) => ctx.props.name }]),
      { name: 'Ada' },
    );

    expect(result.ok).toBe(true);
    expect(result.html).toBe('Ada');
    expect(result.parts.map((part) => [part.id, part.status])).toEqual([['only', 'ok']]);
  });

  it('renders parts in order and composes the result', () => {
    const result = renderTemplate(makeTemplate(), { name: 'Ada' });

    expect(result.ok).toBe(true);
    expect(result.templateId).toBe('welcome');
    expect(result.html).toBe('<h1>Hello, Ada</h1><p>Welcome aboard.</p>');
    expect(result.parts.map((p) => p.id)).toEqual(['greeting', 'body']);
    expect(result.parts.every((p) => p.status === 'ok')).toBe(true);
  });

  it('marks empty parts as "empty" and still composes', () => {
    const result = renderTemplate(
      parts([
        { id: 'a', render: () => 'A' },
        { id: 'blank', render: () => '' },
        { id: 'missing', render: () => undefined as unknown as string },
      ]),
      { name: 'Ada' },
    );

    expect(result.ok).toBe(true);
    expect(result.html).toBe('A||');
    expect(result.parts.map((part) => part.status)).toEqual(['ok', 'empty', 'empty']);
  });

  it('normalizes null/undefined part returns to ""', () => {
    const template = makeTemplate({
      parts: [
        { id: 'a', render: () => null },
        { id: 'b', render: () => undefined },
      ],
      compose: (r) => `[${r.a ?? ''}][${r.b ?? ''}]`,
    });

    const result = renderTemplate(template, { name: 'Ada' });

    expect(result.ok).toBe(true);
    expect(result.html).toBe('[][]');
    expect(result.parts[0]?.status).toBe('empty');
    expect(result.parts[1]?.status).toBe('empty');
  });

  it('exposes props and slots to parts through the context', () => {
    const template = makeTemplate({
      parts: [
        {
          id: 'ctx',
          render: (ctx) => `${ctx.templateId}:${ctx.props.name}:${ctx.slots.footer ?? ''}`,
        },
      ],
      compose: (r) => r.ctx ?? '',
    });

    const result = renderTemplate(template, { name: 'Ada' }, { slots: { footer: 'bye' } });

    expect(result.html).toBe('welcome:Ada:bye');
  });

  it('freezes the slots object handed to parts', () => {
    const template = makeTemplate({
      parts: [
        {
          id: 'mutate',
          render: (ctx) => {
            expect(Object.isFrozen(ctx.slots)).toBe(true);
            return '';
          },
        },
      ],
      compose: () => '',
    });

    renderTemplate(template, { name: 'Ada' }, { slots: { x: 'y' } });
  });

  it('keeps no state between calls', () => {
    const template = makeTemplate();
    const a = renderTemplate(template, { name: 'Ada' });
    const b = renderTemplate(template, { name: 'Ada' });
    expect(a.html).toBe(b.html);
    expect(a.parts).not.toBe(b.parts);
  });

  it('wraps a non-string part return in RenderError', () => {
    const template = makeTemplate({
      parts: [{ id: 'bad', render: () => 42 as unknown as string }],
      compose: () => '',
    });

    expect(() => renderTemplate(template, { name: 'Ada' })).toThrow(RenderError);
    try {
      renderTemplate(template, { name: 'Ada' });
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      expect((error as RenderError).partId).toBe('bad');
      expect((error as RenderError).cause).toBeInstanceOf(TypeError);
    }
  });

  it('does not mutate the template parts array', () => {
    const template = makeTemplate();
    const before = template.parts.map((p) => p.id);
    renderTemplate(template, { name: 'Ada' });
    const after = template.parts.map((p) => p.id);
    expect(after).toEqual(before);
  });

  it('throws RenderError when a part throws and marks later parts skipped', () => {
    let later = 0;
    try {
      renderTemplate(
        parts([
          { id: 'a', render: () => 'A' },
          {
            id: 'bad',
            render: () => {
              throw new Error('nope');
            },
          },
          {
            id: 'later',
            render: () => {
              later += 1;
              return 'L';
            },
          },
        ]),
        { name: 'Ada' },
        { onError: 'throw' },
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      const failure = error as RenderError;
      expect(failure.templateId).toBe('demo');
      expect(failure.partId).toBe('bad');
      expect(failure.cause).toBeInstanceOf(Error);
      expect(failure.trace.map((part) => [part.id, part.status])).toEqual([
        ['a', 'ok'],
        ['bad', 'error'],
        ['later', 'skipped'],
      ]);
      expect(Object.isFrozen(failure.trace)).toBe(true);
    }
    expect(later).toBe(0);
  });

  it('collects a part throw and still renders the following part', () => {
    const result = renderTemplate(
      parts([
        {
          id: 'bad',
          render: () => {
            throw 'boom';
          },
        },
        { id: 'after', render: () => 'AFTER' },
      ]),
      { name: 'Ada' },
      { onError: 'collect' },
    );

    expect(result.ok).toBe(false);
    expect(result.html).toBe('|AFTER');
    expect(result.parts.map((part) => [part.id, part.status])).toEqual([
      ['bad', 'error'],
      ['after', 'ok'],
    ]);
    expect(result.parts[0]?.error).toEqual({ name: 'Error', message: 'boom' });
  });

  it('throws when compose throws in throw mode', () => {
    expect(() =>
      renderTemplate(
        parts([{ id: 'a', render: () => 'A' }], () => {
          throw new Error('compose broke');
        }),
        { name: 'Ada' },
      ),
    ).toThrow(/failed at part "compose"/);
  });

  it('collects a compose failure and a non-string compose return', () => {
    const thrown = renderTemplate(
      parts([{ id: 'a', render: () => 'A' }], () => {
        throw new Error('compose broke');
      }),
      { name: 'Ada' },
      { onError: 'collect' },
    );
    expect(thrown.ok).toBe(false);
    expect(thrown.html).toBe('');
    expect(thrown.composeError?.message).toBe('compose broke');

    const wrongType = renderTemplate(
      parts([{ id: 'a', render: () => 'A' }], () => 1 as unknown as string),
      { name: 'Ada' },
      { onError: 'collect' },
    );
    expect(wrongType.ok).toBe(false);
    expect(wrongType.composeError?.message).toContain('returned number');

    expect(() =>
      renderTemplate(makeTemplate({ compose: () => 42 as unknown as string }), { name: 'Ada' }),
    ).toThrow(RenderError);
  });
});

describe('defineTemplate', () => {
  it('rejects an empty template id', () => {
    expect(() => parts([], undefined, '')).toThrow(RenderError);
    expect(() => parts([], undefined, '')).toThrow(/template id is empty/);
  });

  it('rejects an empty part id, a reserved id, a duplicate id, and a missing compose', () => {
    expect(() => parts([{ id: '', render: () => '' }])).toThrow(/empty part id/);
    expect(() => parts([{ id: 'compose', render: () => '' }])).toThrow(/reserved/);
    expect(() =>
      parts([
        { id: 'a', render: () => 'A' },
        { id: 'a', render: () => 'B' },
      ]),
    ).toThrow(/duplicate part id "a"/);
    expect(() =>
      defineTemplate({
        id: 'bare',
        parts: [],
        compose: undefined as unknown as Template<Props>['compose'],
      }),
    ).toThrow(/missing compose/);
  });

  it('copies and freezes parts so a later caller mutation has no effect', () => {
    const source: TemplatePart<Props>[] = [{ id: 'a', render: () => 'A' }];
    const defined = defineTemplate({
      id: 'demo',
      parts: source,
      compose: (rendered) => rendered.a ?? '',
    });
    source.push({ id: 'b', render: () => 'B' });
    source[0] = { id: 'a', render: () => 'CHANGED' };

    const result = renderTemplate(defined, { name: 'Ada' });

    expect(Object.isFrozen(defined)).toBe(true);
    expect(Object.isFrozen(defined.parts)).toBe(true);
    expect(Object.isFrozen(defined.parts[0])).toBe(true);
    expect(result.html).toBe('A');
    expect(result.parts.map((part) => part.id)).toEqual(['a']);
  });
});

describe('slot', () => {
  const ctx: RenderContext<Props> = {
    templateId: 'demo',
    props: { name: 'Ada' },
    slots: Object.freeze({
      text: 'TEXT',
      empty: '',
      fn: () => 'FN',
      blankFn: () => '',
      nilFn: () => undefined,
      bad: 1 as unknown as string,
      num: () => 2 as unknown as string,
    }),
  };

  it('treats a missing slot as empty and still sees an empty string', () => {
    expect(hasSlot(ctx, 'text')).toBe(true);
    expect(hasSlot(ctx, 'empty')).toBe(true);
    expect(hasSlot(ctx, 'missing')).toBe(false);
    expect(slot(ctx, 'missing')).toBe('');
    expect(slot(ctx, 'empty')).toBe('');
    expect(slot(ctx, 'text')).toBe('TEXT');
  });

  it('calls a function slot and accepts an empty string return', () => {
    expect(slot(ctx, 'fn')).toBe('FN');
    expect(slot(ctx, 'blankFn')).toBe('');
    expect(slot(ctx, 'nilFn')).toBe('');
  });

  it('rejects a non-string slot and a function that returns a non-string', () => {
    expect(() => slot(ctx, 'bad')).toThrow(/slot "bad" is number/);
    expect(() => slot(ctx, 'num')).toThrow(/slot "num" returned number/);
  });
});
