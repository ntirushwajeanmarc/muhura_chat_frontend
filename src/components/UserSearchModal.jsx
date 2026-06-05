import React, { useState, useEffect, useRef } from 'react';
import { searchUsers } from '../api/chats';
import Avatar from './Avatar';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function HighlightMatch({ text, query }) {
  if (!text || !query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-wa-accent/30 text-inherit rounded px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

function displayName(user) {
  if (user.surname) return `${user.username} ${user.surname}`;
  return user.username;
}

function userSubtitle(user, query) {
  const q = query.toLowerCase();
  if (user.surname?.toLowerCase().includes(q)) return user.surname;
  if (user.email?.toLowerCase().includes(q)) return user.email;
  const digits = query.replace(/[^\d]/g, '');
  if (digits && user.phone?.includes(digits)) return user.phone;
  if (user.phone?.toLowerCase().includes(q)) return user.phone;
  return user.email || user.phone || null;
}

export default function UserSearchModal({ title, onSelect, onClose, multiSelect = false, onConfirm }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const users = await searchUsers(trimmed);
        setResults(users);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleUser = (user) => {
    if (!multiSelect) {
      onSelect(user);
      onClose();
      return;
    }
    setSelected((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) return prev.filter((u) => u.id !== user.id);
      return [...prev, user];
    });
  };

  const handleConfirm = () => {
    if (onConfirm && selected.length > 0) {
      onConfirm(selected);
      onClose();
    }
  };

  const showSuggestions = query.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="text-wa-muted hover:text-slate-200 px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="px-4 pt-3 relative">
          <input
            ref={inputRef}
            className="w-full px-3.5 py-2.5 bg-wa-surface border border-wa-border rounded-lg text-sm outline-none focus:border-wa-accent"
            type="text"
            placeholder="Type name, surname, email or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions && results.length > 0}
            aria-autocomplete="list"
          />
          {loading && (
            <span className="absolute right-7 top-1/2 -translate-y-1/2 text-xs text-wa-muted">…</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-[200px] max-h-[360px]">
          {!showSuggestions && (
            <p className="text-center text-wa-muted text-sm py-4">
              Start typing — suggestions appear as letters match
            </p>
          )}
          {showSuggestions && !loading && results.length === 0 && (
            <p className="text-center text-wa-muted text-sm py-4">No matches for &ldquo;{query.trim()}&rdquo;</p>
          )}
          {showSuggestions && results.length > 0 && (
            <p className="text-[11px] font-semibold text-wa-muted tracking-wider px-2.5 pb-1.5">
              SUGGESTIONS
            </p>
          )}
          {results.map((user) => {
            const isSelected = selected.some((u) => u.id === user.id);
            const subtitle = userSubtitle(user, query);
            const name = displayName(user);
            return (
              <button
                key={user.id}
                type="button"
                className={`flex items-center gap-3 w-full p-2.5 rounded-lg text-left transition-colors ${
                  isSelected ? 'bg-wa-accent/15' : 'hover:bg-wa-surface'
                }`}
                onClick={() => toggleUser(user)}
              >
                <Avatar username={user.username} color={user.avatar_color} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    <HighlightMatch text={name} query={query.trim()} />
                  </div>
                  {subtitle && (
                    <div className="text-xs text-wa-muted truncate">
                      <HighlightMatch text={subtitle} query={query.trim()} />
                    </div>
                  )}
                </div>
                {multiSelect && isSelected && <span className="text-wa-accent font-bold">✓</span>}
              </button>
            );
          })}
        </div>

        {multiSelect && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-wa-border">
            <span className="text-sm text-wa-muted">{selected.length} selected</span>
            <button
              type="button"
              className="px-4 py-2 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-50 rounded-lg text-white text-sm font-semibold"
              disabled={selected.length === 0}
              onClick={handleConfirm}
            >
              Add members
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
