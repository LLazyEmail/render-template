import { describe, expect, it } from 'vitest';
import { defineTemplate, renderMany, RenderError, type RenderJob, type TemplatePart } from '../src';

type Props = Record<string, string>;

function template(parts: readonly TemplatePart<Props>[], id = 'demo') {
  return defineTemplate({
    id,
    parts,
    compose: (rendered) => parts.map((part) => rendered[part.id] ?? '').join('|'),
  });
}

describe('renderMany', () => {
  it('renders each job on its own and keeps going when one is collected', () => {
    const okTemplate = template([{ id: 'a', render: (ctx) => ctx.props['label'] ?? '' }], 'ok');
    const badTemplate = template(
      [
        {
          id: 'bad',
          render: () => {
            throw new Error('x');
          },
        },
      ],
      'bad',
    );
    const jobs: readonly RenderJob<Props>[] = [
      { template: okTemplate, props: { label: 'ONE' } },
      { template: badTemplate },
      { template: okTemplate, props: { label: 'TWO' }, slots: { unused: 'nope' } },
    ];

    const results = renderMany(jobs, { onError: 'collect' });

    expect(results.map((result) => result.ok)).toEqual([true, false, true]);
    expect(results.map((result) => result.templateId)).toEqual(['ok', 'bad', 'ok']);
    expect(results[0]?.html).toBe('ONE');
    expect(results[1]?.html).toBe('');
    expect(results[1]?.parts[0]?.status).toBe('error');
    expect(results[2]?.html).toBe('TWO');
    expect(results[0]?.html).not.toBe(results[2]?.html);
  });

  it('uses throw mode when no batch option is passed and does not run later jobs', () => {
    let later = 0;
    const badTemplate = template([
      {
        id: 'bad',
        render: () => {
          throw new Error('x');
        },
      },
    ]);
    const laterTemplate = template(
      [
        {
          id: 'later',
          render: () => {
            later += 1;
            return 'L';
          },
        },
      ],
      'later',
    );

    expect(() =>
      renderMany([{ template: badTemplate, props: { label: 'Z' } }, { template: laterTemplate }]),
    ).toThrow(RenderError);
    expect(later).toBe(0);
  });

  it('defaults missing props to an empty object and passes job slots', () => {
    const seen: Props[] = [];
    const defined = template([
      {
        id: 'a',
        render: (ctx) => {
          seen.push(ctx.props);
          return ctx.slots.note ?? '';
        },
      },
    ]);

    const [result] = renderMany([{ template: defined, slots: { note: 'NOTE' } }]);

    expect(seen[0]).toEqual({});
    expect(result?.html).toBe('NOTE');
  });

  it('returns an empty list for an empty batch', () => {
    expect(renderMany([])).toEqual([]);
  });
});
