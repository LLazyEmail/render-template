import { describe, expect, it } from 'vitest';
import { renderTemplate, type Template } from '../src';

interface Props {
  name: string;
}

describe('renderTemplate trace', () => {
  it('reports chars and ms on each row', () => {
    const template: Template<Props> = {
      id: 'x',
      parts: [
        { id: 'a', render: () => 'abcd' },
        { id: 'b', render: () => '' },
      ],
      compose: (r) => `${r.a}${r.b}`,
    };

    const result = renderTemplate(template, { name: 'Ada' });

    const [a, b] = result.parts;
    expect(a?.chars).toBe(4);
    expect(a?.ms).toBeGreaterThanOrEqual(0);
    expect(b?.chars).toBe(0);
    expect(b?.status).toBe('empty');
  });

  it('freezes each trace row and its error object', () => {
    const template: Template<Props> = {
      id: 'x',
      parts: [
        {
          id: 'a',
          render: () => {
            throw new Error('boom');
          },
        },
      ],
      compose: () => '',
    };

    const result = renderTemplate(template, { name: 'Ada' }, { onError: 'collect' });

    expect(Object.isFrozen(result.parts)).toBe(true);
    for (const row of result.parts) {
      expect(Object.isFrozen(row)).toBe(true);
      if (row.error) expect(Object.isFrozen(row.error)).toBe(true);
    }
  });
});