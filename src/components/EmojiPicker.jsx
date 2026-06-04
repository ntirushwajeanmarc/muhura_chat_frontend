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
    <div className="emoji-picker-wrap" ref={rootRef}>
      <button
        type="button"
        className="emoji-toggle-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title="Add emoji"
        aria-label="Add emoji"
        aria-expanded={open}
      >
        😊
      </button>
      {open && (
        <div className="emoji-picker-panel" role="listbox" aria-label="Emoji picker">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-picker-item"
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
