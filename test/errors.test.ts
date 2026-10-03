import { describe, expect, it, vi } from 'vitest';
import { renderTemplate, RenderError, type Template } from '../src';

interface Props {
  name: string;
}

const base: Template<Props> = {
  id: 'welcome',
  parts: [
    { id: 'a', render: () => 'a' },
    { id: 'b', render: () => 'b' },
    { id: 'c', render: () => 'c' },
  ],
  compose: (r) => `${r.a}${r.b}${r.c}`,
};

describe('renderTemplate error modes', () => {
  it('throws RenderError on part failure in throw mode (default)', () => {
    const failing: Template<Props> = {
      ...base,
      parts: [
        { id: 'a', render: () => 'a' },
        {
          id: 'b',
          render: () => {
            throw new Error('boom');
          },
        },
        { id: 'c', render: () => 'c' },
      ],
    };

    expect(() => renderTemplate(failing, { name: 'Ada' })).toThrow(RenderError);

    try {
      renderTemplate(failing, { name: 'Ada' });
    } catch (error) {
      const err = error as RenderError;
      expect(err.templateId).toBe('welcome');
      expect(err.partId).toBe('b');
      expect(err.message).toContain('failed at part "b"');
      expect(err.message).toContain('boom');
      expect(err.trace.map((t) => [t.id, t.status])).toEqual([
        ['a', 'ok'],
        ['b', 'error'],
        ['c', 'skipped'],
      ]);
      expect(err.cause).toBeInstanceOf(Error);
    }
  });

  it('collects part failure without throwing when onError is "collect"', () => {
    const failing: Template<Props> = {
      ...base,
      parts: [
        { id: 'a', render: () => 'a' },
        {
          id: 'b',
          render: () => {
            throw new Error('boom');
          },
        },
        { id: 'c', render: () => 'c' },
      ],
    };

    const result = renderTemplate(failing, { name: 'Ada' }, { onError: 'collect' });

    expect(result.ok).toBe(false);
    expect(result.html).toBe('ac');
    expect(result.parts.map((t) => [t.id, t.status])).toEqual([
      ['a', 'ok'],
      ['b', 'error'],
      ['c', 'ok'],
    ]);
    expect(result.parts[1]?.error?.message).toBe('boom');
  });

  it('throws RenderError when compose throws in throw mode', () => {
    const failing: Template<Props> = {
      ...base,
      compose: () => {
        throw new Error('compose broke');
      },
    };

    try {
      renderTemplate(failing, { name: 'Ada' });
      throw new Error('expected throw');
    } catch (error) {
      const err = error as RenderError;
      expect(err).toBeInstanceOf(RenderError);
      expect(err.partId).toBe('compose');
      expect(err.message).toContain('failed at part "compose"');
    }
  });

  it('collects compose failure when onError is "collect"', () => {
    const failing: Template<Props> = {
      ...base,
      compose: () => {
        throw new Error('compose broke');
      },
    };

    const result = renderTemplate(failing, { name: 'Ada' }, { onError: 'collect' });

    expect(result.ok).toBe(false);
    expect(result.html).toBe('');
    expect(result.composeError?.message).toBe('compose broke');
  });

  it('names non-Error throws as "Error"', () => {
    const failing: Template<Props> = {
      ...base,
      parts: [{ id: 'a', render: () => {
        // eslint-disable-next-line no-throw-literal
        throw 'nope';
      } }],
      compose: () => '',
    };

    try {
      renderTemplate(failing, { name: 'Ada' });
    } catch (error) {
      const err = error as RenderError;
      expect(err.trace[0]?.error).toEqual({ name: 'Error', message: 'nope' });
    }
  });
});