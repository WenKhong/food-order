import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, parseMarkdown } from './markdown';

test('plain text is one paragraph', () => {
  assert.deepEqual(parseMarkdown('Hello there.'), [
    { kind: 'paragraph', lines: [[{ kind: 'text', text: 'Hello there.' }]] },
  ]);
});

test('bold and italic inside a line', () => {
  assert.deepEqual(parseInline('Try the **Margherita** (RM 22.90), it is *great*.'), [
    { kind: 'text', text: 'Try the ' },
    { kind: 'bold', text: 'Margherita' },
    { kind: 'text', text: ' (RM 22.90), it is ' },
    { kind: 'italic', text: 'great' },
    { kind: 'text', text: '.' },
  ]);
});

test('a lone asterisk or "2 × 3" is left as text', () => {
  assert.deepEqual(parseInline('2 × Margherita * extra'), [{ kind: 'text', text: '2 × Margherita * extra' }]);
});

test('bulleted and numbered lists, with a paragraph before and after', () => {
  const blocks = parseMarkdown(
    'We have:\n- **Margherita** (RM 22.90)\n* Four Cheese\n\nSteps:\n1. Add to cart\n2. Check out\nEnjoy!',
  );
  assert.deepEqual(
    blocks.map((block) => (block.kind === 'list' ? `${block.ordered ? 'ol' : 'ul'}:${block.items.length}` : 'p')),
    ['p', 'ul:2', 'p', 'ol:2', 'p'],
  );
  assert.deepEqual(blocks[1], {
    kind: 'list',
    ordered: false,
    items: [
      [
        { kind: 'bold', text: 'Margherita' },
        { kind: 'text', text: ' (RM 22.90)' },
      ],
      [{ kind: 'text', text: 'Four Cheese' }],
    ],
  });
});

test('lines stay together in a paragraph until a blank line', () => {
  const blocks = parseMarkdown('Line one\nLine two\n\nNew paragraph');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].kind === 'paragraph' && blocks[0].lines.length, 2);
});

test('HTML is just text: nothing is ever interpreted as markup', () => {
  assert.deepEqual(parseInline('<img src=x onerror=alert(1)><b>hi</b>'), [
    { kind: 'text', text: '<img src=x onerror=alert(1)><b>hi</b>' },
  ]);
});
