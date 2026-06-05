import React from 'react';

/** WhatsApp-style double check: amber = delivered, blue = read */
export default function MessageReceipt({ status }) {
  if (!status) return null;

  const color = status === 'read' ? '#34b7f1' : '#eab308';

  return (
    <span className="inline-flex items-center shrink-0" title={status === 'read' ? 'Read' : 'Delivered'} aria-label={status === 'read' ? 'Read' : 'Delivered'}>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true">
        <path
          d="M1 5.5L3.5 8L7.5 2"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 5.5L8 8L14 1.5"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
