import { describe, expect, it } from 'vitest';
import { renderTemplate, RenderError, type Template } from '../src';

const props = { name: 'Ada' };

function tpl(overrides: Partial<Template<typeof props>>): Template<typeof props> {
  return {
    id: 'x',
    parts: [],
    compose: () => '',
    ...overrides,
  };
}

describe('renderTemplate validation', () => {
  it('rejects an empty template id', () => {
    expect(() => renderTemplate(tpl({ id: '' }), props)).toThrow(RenderError);
  });

  it('rejects an empty part id', () => {
    const t = tpl({ parts: [{ id: '', render: () => '' }] });
    expect(() => renderTemplate(t, props)).toThrow(/empty part id/);
  });

  it('rejects the reserved part id "compose"', () => {
    const t = tpl({ parts: [{ id: 'compose', render: () => '' }] });
    expect(() => renderTemplate(t, props)).toThrow(/reserved/);
  });

  it('rejects duplicate part ids', () => {
    const t = tpl({
      parts: [
        { id: 'a', render: () => '' },
        { id: 'a', render: () => '' },
      ],
    });
    expect(() => renderTemplate(t, props)).toThrow(/duplicate part id "a"/);
  });

  it('rejects a missing compose function', () => {
    const t = tpl({ compose: undefined as unknown as Template<typeof props>['compose'] });
    expect(() => renderTemplate(t, props)).toThrow(/missing compose/);
  });
});