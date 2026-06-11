import React from 'react';
import { Undo2 } from 'lucide-react';

const btnClass =
  'flex items-center justify-center w-6 h-6 rounded-md text-wa-muted hover:text-red-400 hover:bg-white/10 transition-colors';

export default function DeleteButton({ onClick, className = btnClass, title = 'Unsend message' }) {
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
      <Undo2 size={16} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
