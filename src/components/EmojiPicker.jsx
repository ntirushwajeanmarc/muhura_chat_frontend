import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const EMOJIS = [
  '😀', '😂', '😊', '😍', '😎', '🤔', '😢', '😡', '👍', '👎',
  '👏', '🙏', '❤️', '🔥', '✅', '❌', '🎉', '📚', '💡', '🚀',
  '☕', '✨', '💯', '🙌',
];

export default function EmojiPicker({ onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const panelWidth = 240;
    const panelHeight = 160;
    let left = rect.left;
    let top = rect.top - panelHeight - 8;

    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    if (left < 8) left = 8;
    if (top < 8) {
      top = rect.bottom + 8;
    }

    setPanelStyle({ top, left, width: panelWidth });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (
        panelRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (emoji) => {
    onSelect(emoji);
    setOpen(false);
  };

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="w-9 h-9 rounded-lg text-xl hover:bg-wa-panel disabled:opacity-40 shrink-0 transition-colors"
        onClick={toggle}
        disabled={disabled}
        title="Add emoji"
        aria-label="Add emoji"
        aria-expanded={open}
      >
        😊
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[200] grid grid-cols-6 gap-1 p-2 bg-wa-panel border border-wa-border rounded-xl shadow-2xl"
          style={panelStyle}
          role="listbox"
          aria-label="Emoji picker"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="w-9 h-9 rounded-lg text-xl hover:bg-wa-surface active:scale-95 transition-all"
              onClick={() => pick(emoji)}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
