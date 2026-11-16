# @llazyemail/render-template

Deterministic HTML template renderer. Define a template as an ordered list of
parts plus a `compose` step; the renderer runs each part, records a trace, and
returns the final HTML.

- **Deterministic** — same template + props always produce the same HTML.
- **Stateless** — nothing is remembered between calls.
- **Traceable** — every part gets a row with `status`, `chars`, `ms`, and
  optional `error`.
- **Two error modes** — fail fast (`'throw'`) or collect-and-continue
  (`'collect'`).
- **String parts only** — each part must return a string. Lit `TemplateResult`s,
  Promises, or other non-strings are errors. Convert Lit output to a string
  before it reaches a part.

Working on this repo with an AI agent? Start at [AGENTS.md](./AGENTS.md).

## Install

Published to GitHub Packages, not npmjs. Point the scope at it first, with a
token that has `read:packages`:

```ini
# .npmrc
@llazyemail:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```sh
npm install @llazyemail/render-template
# or
pnpm add @llazyemail/render-template
```

## Usage

```ts
import { renderMany, renderTemplate, type RenderJob, type Template } from '@llazyemail/render-template';

interface Props {
  name: string;
}

const welcome: Template<Props> = {
  id: 'welcome',
  parts: [
    { id: 'greeting', render: (ctx) => `<h1>Hello, ${ctx.props.name}</h1>` },
    { id: 'body', render: () => `<p>Welcome aboard.</p>` },
  ],
  compose: (r) => r.greeting + r.body,
};

const result = renderTemplate(welcome, { name: 'Ada' });

console.log(result.html);
// <h1>Hello, Ada</h1><p>Welcome aboard.</p>

const jobs: RenderJob<Props>[] = [{ template: welcome, props: { name: 'Ada' } }];
const batch = renderMany(jobs, { onError: 'collect' });
```

## Error modes

By default, a broken part throws a `RenderError`. In CI or batch pipelines,
prefer `collect` so one bad template doesn't stop the run:

```ts
const result = renderTemplate(welcome, { name: 'Ada' }, { onError: 'collect' });

if (!result.ok) {
  for (const row of result.parts) {
    if (row.status === 'error') console.error(row.id, row.error);
  }
}
```

`renderMany` uses the same `RenderOptions.onError`. `throw` skips later jobs.
`collect` records the failure and continues.

## Types

All public types are re-exported from the package root:
`Template`, `TemplatePart`, `RenderContext`, `RenderOptions`, `RenderResult`,
`PartTrace`, `PartFailure`, `SlotValue`, `RenderJob`, `ErrorMode`, `PartStatus`.

`renderTemplate` and `renderMany` live in `src/api`.

## Related packages

- `template-runtime-display` — email shell helpers (`defineEmailTemplate`,
  `renderEmail`) on top of this runtime.
- `generate-template` — catalog, payload resolution, and disk writes. Consumers
  should inject their render functions into `createGenerator` rather than
  reimplementing generation logic.

## Slots and `defineTemplate`

`defineTemplate` validates a template once (non-empty ids, no duplicate part
ids, `compose` present, `compose` is a reserved part id), then copies and
freezes it so later edits to your arrays cannot change it.

Slots are caller-supplied fragments. A slot is a string or a function of the
render context. Read them with `slot(ctx, id)` (missing → `''`) and
`hasSlot(ctx, id)` (true even for an empty string):

```ts
import { defineTemplate, hasSlot, renderTemplate, slot } from '@llazyemail/render-template';

const card = defineTemplate<{ title: string }>({
  id: 'card',
  parts: [
    { id: 'title', render: (ctx) => `<h2>${ctx.props.title}</h2>` },
    {
      id: 'footer',
      render: (ctx) => (hasSlot(ctx, 'footer') ? `<footer>${slot(ctx, 'footer')}</footer>` : ''),
    },
  ],
  compose: (r) => r.title + r.footer,
});

renderTemplate(card, { title: 'Hi' }, { slots: { footer: (ctx) => `by ${ctx.templateId}` } }).html;
// <h2>Hi</h2><footer>by card</footer>

renderTemplate(card, { title: 'Hi' }).html;
// <h2>Hi</h2>   (footer part traced as status "empty")
```

A slot that is not a string or function, or a function slot that returns a
non-string, throws a `RenderError`.

## Trace rows and `RenderResult`

`renderTemplate` returns a frozen `RenderResult`:

| Field | Meaning |
| --- | --- |
| `templateId` | The template id |
| `ok` | `false` if any part or compose failed |
| `html` | Output of `compose` (`''` if compose failed in `collect` mode) |
| `parts` | One `PartTrace` per part, in template order |
| `composeError` | `{ name, message }` when compose failed in `collect` mode |

Each `PartTrace` row is `{ id, status, html, chars, ms, error? }`, where
`status` is one of:

| Status | When |
| --- | --- |
| `ok` | Part returned a non-empty string |
| `empty` | Part returned `''`, `null` or `undefined` |
| `error` | Part threw or returned a non-string (`error` holds `{ name, message }`) |
| `skipped` | `throw` mode only: parts after the first failure |

What each mode does with a failing part `bad` between `ok` (`'A'`) and `later` (`'C'`):

| Mode | Result |
| --- | --- |
| `throw` (default) | Throws `RenderError` with `partId: 'bad'`, message `template "b" failed at part "bad": boom`, and `trace` = ok / error / skipped. The original error is `cause` |
| `collect` | Returns `ok: false`, `html: 'AC'`: the failed part contributes `''` to `compose`, and later parts still run |

`RenderError` also covers invalid templates (`partId: 'template'`) and compose
failures (`partId: 'compose'`).

## Lower-level exports

These are exported for wrappers such as `template-runtime-display`; most
callers only need `renderTemplate`, `renderMany`, `defineTemplate`, `slot`
and `hasSlot`.

| Export | Purpose |
| --- | --- |
| `assertTemplate(template)` | The validation `defineTemplate` runs, without copying |
| `createContext(templateId, props, slots)` | Build the frozen `RenderContext` |
| `normalizeHtml(partId, value)` | `null`/`undefined` → `''`, string → string, anything else → `TypeError` |
| `finish(template, ctx, rendered, trace, ok, onError)` | Run `compose` and build the `RenderResult` |
| `okTrace`, `skippedTrace`, `describeError`, `publish` | Build and freeze trace rows |

## Layout

```text
src/
├── index.ts              public surface (re-exports below)
├── types.ts              Template, TemplatePart, RenderContext, RenderResult, …
├── errors.ts             RenderError
├── api/
│   ├── render.ts         renderTemplate, finish
│   └── renderMany.ts     renderMany
└── helpers/
    ├── defineTemplate.ts validate + freeze
    ├── validation.ts     assertTemplate
    ├── context.ts        createContext
    ├── slot.ts           slot, hasSlot
    ├── html.ts           normalizeHtml
    └── trace.ts          trace rows + publish
test/                     Vitest suites (coverage thresholds in vitest.config.ts)
sandbox/example.mjs       renders sandbox/generated/*.html for the Sandbox HTML workflow
```

## License

MIT
