import { describe, expect, it, vi } from 'vitest';
import { renderTemplate, type Template } from '../src';

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

describe('renderTemplate', () => {
  it('renders parts in order and composes the result', () => {
    const result = renderTemplate(makeTemplate(), { name: 'Ada' });

    expect(result.ok).toBe(true);
    expect(result.templateId).toBe('welcome');
    expect(result.html).toBe('<h1>Hello, Ada</h1><p>Welcome aboard.</p>');
    expect(result.parts.map((p) => p.id)).toEqual(['greeting', 'body']);
    expect(result.parts.every((p) => p.status === 'ok')).toBe(true);
  });

  it('marks empty parts as "empty" and still composes', () => {
    const template = makeTemplate({
      parts: [{ id: 'blank', render: () => '' }],
      compose: (rendered) => `[${rendered.blank ?? ''}]`,
    });

    const result = renderTemplate(template, { name: 'Ada' });

    expect(result.ok).toBe(true);
    expect(result.html).toBe('[]');
    expect(result.parts[0]?.status).toBe('empty');
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

  it('throws a TypeError when a part returns a non-string', () => {
    const template = makeTemplate({
      parts: [{ id: 'bad', render: () => 42 as unknown as string }],
      compose: () => '',
    });

    expect(() => renderTemplate(template, { name: 'Ada' })).toThrow(TypeError);
  });

  it('throws a TypeError when compose returns a non-string', () => {
    const template = makeTemplate({
      compose: () => 42 as unknown as string,
    });

    expect(() => renderTemplate(template, { name: 'Ada' })).toThrow(TypeError);
  });

  it('does not mutate the template parts array', () => {
    const template = makeTemplate();
    const before = template.parts.map((p) => p.id);
    renderTemplate(template, { name: 'Ada' });
    const after = template.parts.map((p) => p.id);
    expect(after).toEqual(before);
  });
});
