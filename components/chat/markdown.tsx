import { parseMarkdown, type Inline } from '@/lib/chat/markdown';

// Renders the assistant's light markdown as React elements. React escapes all
// text, and nothing is passed as raw HTML, so a reply can never inject markup.
export function Markdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      {parseMarkdown(text).map((block, index) => {
        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul';
          return (
            <List key={index} className={block.ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineText parts={item} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                <InlineText parts={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function InlineText({ parts }: { parts: Inline[] }) {
  return parts.map((part, index) => {
    if (part.kind === 'bold') return <strong key={index}>{part.text}</strong>;
    if (part.kind === 'italic') return <em key={index}>{part.text}</em>;
    return <span key={index}>{part.text}</span>;
  });
}
