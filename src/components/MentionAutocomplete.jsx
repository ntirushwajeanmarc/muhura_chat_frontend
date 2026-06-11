import React from 'react';
import Avatar from './Avatar';

export default function MentionAutocomplete({ candidates, activeIndex, onSelect }) {
  if (!candidates?.length) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-lg border border-wa-border bg-wa-panel shadow-lg z-40"
      role="listbox"
      aria-label="Mention a user"
    >
      {candidates.map((user, index) => (
        <button
          key={user.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
            index === activeIndex ? 'bg-wa-surface text-slate-100' : 'text-slate-200 hover:bg-wa-surface/80'
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(user);
          }}
        >
          <Avatar username={user.username} color={user.avatar_color} avatarUrl={user.avatar_url} size={28} />
          <span className="font-medium">@{user.username}</span>
          {user.surname && <span className="text-wa-muted truncate">{user.surname}</span>}
        </button>
      ))}
    </div>
  );
}
