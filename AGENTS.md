# Agent notes for render-template

`@llazyemail/render-template` is the low-level deterministic part/compose renderer. Parts return strings. The package is stateless. It is the foundation under `@llazyemail/template-runtime-display`.

## String-only contract

Every part `render` function must return a string (or null/undefined, which become `''`). Returning a Lit `TemplateResult`, a Promise, or any other non-string is an error. This is the most common source of problems when mixing this runtime with Lit SSR.

Consumers that author with Lit must convert the Lit result to a string *before* handing HTML to a part or to `compose`. Do not put Lit templates inside parts.

## Ecosystem

- This package owns the part execution, traces, and error modes (`throw` / `collect`).
- `@llazyemail/template-runtime-display` adds email shell fragments and re-exports the runtime helpers.
- `@llazyemail/generate-template` owns catalogs, payloads, and disk writes. Do not add generation logic here.

## Commands

```bash
npm install
npm run build
npm test
npm run test:coverage
npm run typecheck
```

Node >= 22 (`engines.node`). CI runs on Node **22 and 24** (`.github/workflows/build.yml`).

## Test and coverage rules

- `tsconfig` keeps `strict` and `noUncheckedIndexedAccess` on. Do not turn them off.
- Coverage thresholds live in `vitest.config.ts` (lines/functions/statements 95, branches 90). Do not lower them. Prefer adding tests over excluding source.
- Run `npm run test:coverage` before handing back changes under `src/`.

## Layout

See README.md for the tree. Public surface is `src/index.ts`.

Do not add Lit as a dependency. Do not add I/O. Keep the package free of template catalogs.

## Release flow

- Publish to GitHub Packages via `.github/workflows/publish.yml` on a GitHub Release (or manual workflow_dispatch).
- Package name/scope stays `@llazyemail/render-template`.

## Conventions

- Small, single-purpose PRs; open them as **draft** first.
- Commit trailer when working for the maintainer:
  `Co-authored-by: petroved <arthur.tkachenko.netweight@gmail.com>`
- Docs: extend or annotate outdated guidance; do not delete existing docs content.
