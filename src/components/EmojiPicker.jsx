import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import IconBtn, { composerBtn } from './IconBtn';

const EMOJIS = [
  // Smileys
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛',
  '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑',
  '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
  '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
  '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
  '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
  '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩',
  '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼',
  // Gestures & people
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘',
  '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
  '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾',
  '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️',
  '👅', '👄', '💋', '🩸',
  // Hearts & symbols
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
  '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
  '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌',
  '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️',
  '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
  '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌',
  '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱',
  '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️',
  '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎',
  '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️',
  '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶',
  '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓',
  '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢',
  '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪',
  '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️',
  '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃',
  '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️',
  '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴',
  '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤',
  '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧',
  '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫',
  '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴',
  '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉',
  '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲',
  '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌩️', '❄️', '🔥', '💧', '🌈',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍',
  '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '☕', '🍺', '🥂', '🍾',
];

export default function EmojiPicker({
  onSelect,
  disabled,
  open: controlledOpen,
  onOpenChange,
  anchorRef: externalAnchorRef,
  showTrigger = true,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const internalBtnRef = useRef(null);
  const panelRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value) => {
    if (isControlled) onOpenChange?.(value);
    else setInternalOpen(value);
  };
  const positionRef = externalAnchorRef || internalBtnRef;

  const updatePosition = () => {
    if (!positionRef.current) return;
    const rect = positionRef.current.getBoundingClientRect();
    const panelWidth = Math.min(320, window.innerWidth - 16);
    const panelHeight = Math.min(360, window.innerHeight - 24);
    let left = rect.left;
    let top = rect.top - panelHeight - 8;

    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    if (left < 8) left = 8;
    if (top < 8) top = rect.bottom + 8;

    setPanelStyle({ top, left, width: panelWidth, maxHeight: panelHeight });
  };

  useEffect(() => {
    if (!open) return undefined;
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
    if (!open) return undefined;
    const close = (e) => {
      if (
        panelRef.current?.contains(e.target)
        || positionRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, setOpen, positionRef]);

  const pick = (emoji) => {
    onSelect(emoji);
    setOpen(false);
  };

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  return (
    <>
      {showTrigger && (
        <IconBtn
          ref={internalBtnRef}
          icon={Smile}
          className={composerBtn}
          onClick={toggle}
          disabled={disabled}
          title="Add emoji"
          aria-label="Add emoji"
          aria-expanded={open}
          size={20}
        />
      )}
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[200] grid grid-cols-10 gap-0.5 p-2 bg-wa-panel border border-wa-border rounded-xl shadow-2xl overflow-y-auto"
          style={panelStyle}
          role="listbox"
          aria-label="Emoji picker"
        >
          {EMOJIS.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              className="w-7 h-7 rounded-lg text-base hover:bg-wa-surface active:scale-95 transition-all"
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
