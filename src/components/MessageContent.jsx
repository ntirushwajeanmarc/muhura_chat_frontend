import React from 'react';
import CodeBlock from './CodeBlock';

const FENCE_RE = /```(\w*)\n?([\s\S]*?)```/g;

function looksLikePastedCode(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return false;
  const indented = lines.filter((l) => /^\s{2,}|\t/.test(l)).length;
  const codeLike = lines.filter((l) =>
    /[{}();[\]]|=>|function\s|const\s|let\s|var\s|import\s|class\s|def\s|#include|public\s|private\s/.test(l)
  ).length;
  return indented >= 2 || codeLike >= 2;
}

export function parseMessageContent(content) {
  if (!content) return [{ type: 'text', value: '' }];

  const segments = [];
  let lastIndex = 0;
  let match;

  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) segments.push({ type: 'text', value: text });
    }
    segments.push({
      type: 'code',
      value: match[2].replace(/\n$/, ''),
      lang: match[1] || '',
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const rest = content.slice(lastIndex);
    if (rest) segments.push({ type: 'text', value: rest });
  }

  if (segments.length === 0) {
    if (looksLikePastedCode(content)) {
      return [{ type: 'code', value: content }];
    }
    return [{ type: 'text', value: content }];
  }

  return segments;
}

const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

function trimUrlPunctuation(url) {
  let trimmed = url;
  let trailing = '';
  while (/[.,;:!?)}\]]$/.test(trimmed)) {
    trailing = trimmed.slice(-1) + trailing;
    trimmed = trimmed.slice(0, -1);
  }
  return { url: trimmed, trailing };
}

function linkifyText(text) {
  const parts = [];
  let lastIndex = 0;
  let match;

  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const { url, trailing } = trimUrlPunctuation(match[0]);
    if (url) {
      parts.push({
        type: 'link',
        value: url,
        href: url.startsWith('www.') ? `https://${url}` : url,
      });
    }
    if (trailing) parts.push({ type: 'text', value: trailing });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}

function TextPart({ text }) {
  if (!text) return null;
  const hasNewlines = text.includes('\n');
  const parts = linkifyText(text);

  return (
    <span className={hasNewlines ? 'whitespace-pre-wrap break-words' : 'break-words'}>
      {parts.map((part, i) =>
        part.type === 'link' ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 underline underline-offset-2 hover:text-sky-300 break-all"
          >
            {part.value}
          </a>
        ) : (
          <React.Fragment key={i}>{part.value}</React.Fragment>
        )
      )}
    </span>
  );
}

export default function MessageContent({ content }) {
  const segments = parseMessageContent(content);

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <CodeBlock key={i} code={seg.value} lang={seg.lang} />
        ) : (
          <TextPart key={i} text={seg.value} />
        )
      )}
    </div>
  );
}
