import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from '../dist/index.js';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'generated');
fs.mkdirSync(outDir, { recursive: true });

const welcome = {
  id: 'welcome',
  parts: [
    { id: 'greeting', render: (ctx) => `<h1>Hello, ${ctx.props.name}</h1>` },
    { id: 'body', render: () => '<p>Welcome aboard.</p>' },
  ],
  compose: (parts) => parts.greeting + parts.body,
};

const invoice = {
  id: 'invoice',
  parts: [
    { id: 'title', render: (ctx) => `<h1>Invoice ${ctx.props.invoiceId}</h1>` },
    { id: 'body', render: (ctx) => `<p>Amount due: ${ctx.props.amount}</p>` },
  ],
  compose: (parts) => parts.title + parts.body,
};

function write(name, template, props) {
  const result = renderTemplate(template, props);
  if (!result.ok || !result.html) {
    throw new Error(name + ' did not render');
  }
  const file = path.join(outDir, name + '.html');
  fs.writeFileSync(file, '<!doctype html>' + result.html + '\n');
  console.log('wrote', path.relative(process.cwd(), file));
}

write('welcome', welcome, { name: 'Ada' });
write('invoice', invoice, { invoiceId: 'INV-SANDBOX', amount: '$42' });

const broken = renderTemplate(
  {
    id: 'broken',
    parts: [{ id: 'bad', render: () => { throw new Error('sandbox part failed'); } }],
    compose: (parts) => parts.bad,
  },
  {},
  { onError: 'collect' },
);
if (broken.ok) {
  throw new Error('expected collect mode to record the broken part');
}
console.log('collect mode recorded the broken part');
