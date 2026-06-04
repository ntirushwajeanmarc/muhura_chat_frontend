import React from 'react';
import CopyButton from './CopyButton';

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

function CodeBlock({ code, lang }) {
  return (
    <div className={`msg-code-block${lang ? ' has-lang' : ''}`}>
      {lang && <span className="msg-code-lang">{lang}</span>}
      <CopyButton text={code} className="msg-code-copy" title="Copy code" />
      <pre><code>{code}</code></pre>
    </div>
  );
}

function TextPart({ text }) {
  if (!text) return null;
  const hasNewlines = text.includes('\n');
  return (
    <span className={hasNewlines ? 'msg-text msg-text-pre' : 'msg-text'}>
      {text}
    </span>
  );
}

export default function MessageContent({ content }) {
  const segments = parseMessageContent(content);

  return (
    <div className="msg-content">
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
