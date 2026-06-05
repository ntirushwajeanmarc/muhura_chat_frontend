import React, { useState, useRef, useEffect } from 'react';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍',
  '🥰', '😘', '😎', '🤔', '😮', '😢', '😭', '😡', '🥳', '😴', '🤯', '🙄',
  '👍', '👎', '👏', '🙌', '💪', '🤝', '👋', '🙏', '✌️', '🤞', '💯', '🔥',
  '❤️', '💙', '💚', '💛', '💜', '🖤', '✨', '⭐', '🎉', '🎊', '🎈', '🏆',
  '📚', '✏️', '📝', '💡', '✅', '❌', '⚠️', '❓', '❗', '🚀', '💻', '📎',
  '☕', '🍕', '🎵', '⚽', '🌙', '☀️', '🌈', '🐱', '🐶', '🦋', '🌸', '🍀',
];

export default function EmojiPicker({ onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (emoji) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className="w-9 h-9 rounded-lg text-xl hover:bg-wa-panel disabled:opacity-40 transition-colors"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title="Add emoji"
        aria-label="Add emoji"
        aria-expanded={open}
      >
        😊
      </button>
      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 z-50 grid grid-cols-8 gap-0.5 p-2.5 bg-wa-panel border border-wa-border rounded-xl shadow-2xl max-h-56 overflow-y-auto"
          role="listbox"
          aria-label="Emoji picker"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="w-9 h-9 rounded-lg text-xl hover:bg-wa-surface hover:scale-110 transition-all"
              onClick={() => pick(emoji)}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
