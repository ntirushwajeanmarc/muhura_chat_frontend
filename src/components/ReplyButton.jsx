import React from 'react';

export default function ReplyButton({ onClick, className = 'msg-reply-btn', title = 'Reply' }) {
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 9H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-4" />
        <polyline points="16 8 20 4 16 0" />
        <line x1="20" y1="4" x2="10" y2="14" />
      </svg>
    </button>
  );
}

export function truncateReply(text, max = 100) {
  if (!text) return '';
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}
