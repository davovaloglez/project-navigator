import type { ReactNode } from 'react';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

type Block =
  | { type: 'code'; content: string }
  | { type: 'list'; items: string[] }
  | { type: 'para'; content: string };

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let buffer = '';

  function flush() {
    if (buffer) {
      nodes.push(buffer);
      buffer = '';
    }
  }

  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        nodes.push(
          <strong key={nodes.length} className="font-semibold text-slate-100">
            {text.slice(i + 2, end)}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        nodes.push(
          <code
            key={nodes.length}
            className="text-blue-300 bg-slate-900/60 border border-slate-700/40 px-1 py-0.5 rounded text-[0.88em] font-mono"
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }
  flush();
  return nodes;
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const segments: { kind: 'code' | 'prose'; content: string }[] = [];
  const codeRe = /```([\s\S]*?)```/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > lastIdx) {
      segments.push({ kind: 'prose', content: text.slice(lastIdx, m.index) });
    }
    segments.push({ kind: 'code', content: m[1].replace(/^\n/, '').replace(/\n$/, '') });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    segments.push({ kind: 'prose', content: text.slice(lastIdx) });
  }

  for (const seg of segments) {
    if (seg.kind === 'code') {
      blocks.push({ type: 'code', content: seg.content });
      continue;
    }
    const lines = seg.content.split('\n');
    let currentList: string[] | null = null;
    let currentPara: string[] | null = null;

    const flushList = () => {
      if (currentList && currentList.length) {
        blocks.push({ type: 'list', items: currentList });
        currentList = null;
      }
    };
    const flushPara = () => {
      if (currentPara && currentPara.length) {
        blocks.push({ type: 'para', content: currentPara.join(' ') });
        currentPara = null;
      }
    };

    for (const line of lines) {
      const listMatch = line.match(/^\s*-\s+(.*)/);
      if (listMatch) {
        flushPara();
        if (!currentList) currentList = [];
        currentList.push(listMatch[1]);
      } else if (line.trim() === '') {
        flushList();
        flushPara();
      } else {
        flushList();
        if (!currentPara) currentPara = [];
        currentPara.push(line);
      }
    }
    flushList();
    flushPara();
  }

  return blocks;
}

/**
 * Light-weight markdown renderer for glossary content. Supports:
 * - **bold**
 * - `inline code`
 * - bullet lists with leading `- `
 * - fenced code blocks with triple backticks
 * - paragraphs separated by blank lines
 */
export default function MarkdownText({ text, className = '' }: MarkdownTextProps) {
  const blocks = parseBlocks(text);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          return (
            <pre
              key={i}
              className="bg-slate-900/70 border border-slate-700/50 rounded-md p-3 my-2 overflow-x-auto text-[12px] font-mono text-slate-200 leading-relaxed"
            >
              <code>{block.content}</code>
            </pre>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="list-disc list-outside pl-5 space-y-1 my-2">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-2 first:mt-0 last:mb-0">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
}

/** Inline-only version: handles **bold** and `code` without lists or paragraphs. */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}
