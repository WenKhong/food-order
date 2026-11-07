// The assistant writes light markdown: **bold**, *italic*, and "-" or "1." lists.
// We parse that small subset ourselves into plain data, and a component turns it
// into React elements. Nothing is ever inserted as HTML, so a reply can't inject
// markup or scripts: anything else, "<b>" included, is shown as plain text.

export type Inline = { kind: 'text' | 'bold' | 'italic'; text: string };
export type Block =
  | { kind: 'paragraph'; lines: Inline[][] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] };

// "**bold**" or "*italic*" (the italic must not start with a space, so the
// "* " of a list item or a lone asterisk is left alone).
const EMPHASIS = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let index = 0;
  for (const match of text.matchAll(EMPHASIS)) {
    if (match.index > index) parts.push({ kind: 'text', text: text.slice(index, match.index) });
    parts.push(match[1] !== undefined ? { kind: 'bold', text: match[1] } : { kind: 'italic', text: match[2] });
    index = match.index + match[0].length;
  }
  if (index < text.length) parts.push({ kind: 'text', text: text.slice(index) });
  return parts;
}

// "- item", "* item", "• item" or "1. item" / "1) item"
const LIST_ITEM = /^(?:[-*•]|(\d+)[.)])\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let afterBlankLine = true;

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (line === '') {
      afterBlankLine = true;
      continue;
    }

    const last = blocks.at(-1);
    const item = LIST_ITEM.exec(line);
    if (item) {
      const ordered = item[1] !== undefined;
      if (last?.kind === 'list' && last.ordered === ordered) last.items.push(parseInline(item[2]));
      else blocks.push({ kind: 'list', ordered, items: [parseInline(item[2])] });
    } else if (last?.kind === 'paragraph' && !afterBlankLine) {
      last.lines.push(parseInline(line)); // a line break inside the same paragraph
    } else {
      blocks.push({ kind: 'paragraph', lines: [parseInline(line)] });
    }
    afterBlankLine = false;
  }
  return blocks;
}
