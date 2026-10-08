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

## Install

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

## License

MIT
```
render-template/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── .gitignore
├── src/
│   ├── index.ts
│   ├── errors.ts
│   ├── api/
│   │   ├── index.ts
│   │   ├── render.ts
│   │   └── renderMany.ts
│   ├── helpers/
│   └── types.ts
└── test/
    ├── renderTemplate.test.ts
    ├── renderMany.test.ts
    ├── errors.test.ts
    ├── validation.test.ts
    └── trace.test.ts
```
