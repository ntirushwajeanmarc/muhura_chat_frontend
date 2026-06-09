import React, { useEffect, useRef, useState } from 'react';
import {
  Phone,
  Video,
  Search,
  UserPlus,
  Image,
  MoreVertical,
} from 'lucide-react';

export default function ChatActionsMenu({
  isDirect,
  showSearch,
  onVoiceCall,
  onVideoCall,
  onToggleSearch,
  onWallpaper,
  onAddMembers,
  isGroup,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    fn?.();
  };

  const items = [
    isDirect && onVoiceCall && {
      id: 'voice',
      label: 'Voice call',
      Icon: Phone,
      onClick: () => run(() => onVoiceCall()),
    },
    isDirect && onVideoCall && {
      id: 'video',
      label: 'Video call',
      Icon: Video,
      onClick: () => run(() => onVideoCall()),
    },
    onToggleSearch && {
      id: 'search',
      label: showSearch ? 'Close search' : 'Search messages',
      Icon: Search,
      onClick: () => run(onToggleSearch),
    },
    isGroup && onAddMembers && {
      id: 'members',
      label: 'Add members',
      Icon: UserPlus,
      onClick: () => run(onAddMembers),
    },
    onWallpaper && {
      id: 'wallpaper',
      label: 'Change wallpaper',
      Icon: Image,
      onClick: () => run(onWallpaper),
    },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className={`touch-target w-10 h-10 rounded-lg flex items-center justify-center ${
          open ? 'bg-wa-accent/20 text-wa-accent' : 'text-wa-muted hover:text-slate-200 hover:bg-wa-surface'
        }`}
        onClick={() => setOpen((v) => !v)}
        title="Chat actions"
        aria-label="Chat actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={20} strokeWidth={1.75} aria-hidden />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1 bg-wa-panel border border-wa-border rounded-xl shadow-2xl"
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left text-slate-200 hover:bg-wa-surface transition-colors"
              onClick={item.onClick}
            >
              <item.Icon size={18} strokeWidth={1.75} className="text-wa-muted shrink-0" aria-hidden />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
