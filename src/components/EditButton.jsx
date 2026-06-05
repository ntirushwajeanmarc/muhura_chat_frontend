import React from 'react';

const btnClass =
  'flex items-center justify-center w-6 h-6 rounded-md text-wa-muted hover:text-slate-200 hover:bg-white/10 transition-colors';

export default function EditButton({ onClick, className = btnClass, title = 'Edit message' }) {
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
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </button>
  );
}
