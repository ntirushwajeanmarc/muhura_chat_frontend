import React from 'react';
import { X } from 'lucide-react';

export default function ModalCloseBtn({
  onClick,
  className = 'text-wa-muted hover:text-slate-200 px-2 inline-flex items-center justify-center',
}) {
  return (
    <button type="button" className={className} onClick={onClick} aria-label="Close">
      <X size={20} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
