import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Paperclip, ImagePlay, Smile, Loader2 } from 'lucide-react';
import IconBtn, { composerBtn } from './IconBtn';
import EmojiPicker from './EmojiPicker';
import GifPicker from './GifPicker';

function usePopoverPosition(anchorRef, open, { width = 200, height = 148 }) {
  const [style, setStyle] = useState({});

  const update = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panelWidth = Math.min(width, window.innerWidth - 16);
    let left = rect.left;
    let top = rect.top - height - 10;

    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    if (left < 8) left = 8;
    if (top < 8) top = rect.bottom + 10;

    setStyle({ top, left, width: panelWidth });
  }, [anchorRef, width, height]);

  useEffect(() => {
    if (!open) return undefined;
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, update]);

  return style;
}

export default function ComposerPlusMenu({
  disabled,
  uploading,
  sendingGif,
  onAttach,
  onEmojiSelect,
  onGifSelect,
  compact = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const menuStyle = usePopoverPosition(anchorRef, menuOpen, { width: 196, height: 152 });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const toggleMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setEmojiOpen(false);
    setGifOpen(false);
    setMenuOpen((o) => !o);
  };

  const pickAttach = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    onAttach?.();
  };

  const pickEmoji = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    setGifOpen(false);
    setEmojiOpen(true);
  };

  const pickGif = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    setEmojiOpen(false);
    setGifOpen(true);
  };

  const btnSize = compact ? 'w-9 h-9' : 'w-10 h-10';
  const iconSize = compact ? 18 : 20;

  const menuItems = [
    {
      id: 'attach',
      label: 'Attach file',
      icon: Paperclip,
      onClick: pickAttach,
      disabled: uploading,
    },
    {
      id: 'gif',
      label: sendingGif ? 'Sending GIF…' : 'GIF',
      icon: sendingGif ? Loader2 : ImagePlay,
      onClick: pickGif,
      disabled: sendingGif,
      spin: sendingGif,
    },
    {
      id: 'emoji',
      label: 'Emoji',
      icon: Smile,
      onClick: pickEmoji,
    },
  ];

  return (
    <>
      <IconBtn
        ref={anchorRef}
        icon={Plus}
        className={`${composerBtn} ${btnSize} ${menuOpen ? 'text-wa-accent bg-wa-accent/10' : ''}`}
        onClick={toggleMenu}
        disabled={disabled}
        title="Add attachment, GIF, or emoji"
        aria-label="Add attachment, GIF, or emoji"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        size={iconSize}
        strokeWidth={2}
      />
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Message extras"
          className="fixed z-[210] py-1.5 bg-wa-panel border border-wa-border rounded-2xl shadow-2xl overflow-hidden"
          style={menuStyle}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={item.onClick}
                className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left text-sm text-slate-200 hover:bg-wa-surface active:bg-wa-surface/80 disabled:opacity-40 transition-colors"
              >
                <span className="w-9 h-9 rounded-xl bg-wa-surface border border-wa-border/80 flex items-center justify-center shrink-0 text-wa-accent">
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className={item.spin ? 'animate-spin' : ''}
                    aria-hidden
                  />
                </span>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
      <EmojiPicker
        onSelect={(emoji) => {
          onEmojiSelect(emoji);
          setEmojiOpen(false);
        }}
        disabled={disabled}
        open={emojiOpen}
        onOpenChange={setEmojiOpen}
        anchorRef={anchorRef}
        showTrigger={false}
      />
      <GifPicker
        onSelect={(gif) => {
          onGifSelect(gif);
          setGifOpen(false);
        }}
        disabled={disabled}
        sending={sendingGif}
        open={gifOpen}
        onOpenChange={setGifOpen}
        anchorRef={anchorRef}
        showTrigger={false}
      />
    </>
  );
}
