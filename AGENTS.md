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
npm run typecheck
```

Node >= 22. CI runs on 22 and 24.

## Layout

See README.md for the tree. Public surface is `src/index.ts`.

Do not add Lit as a dependency. Do not add I/O. Keep the package free of template catalogs.
