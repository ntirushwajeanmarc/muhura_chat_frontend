import React, { useState, useEffect, useRef } from 'react';
import { searchRoomMessages } from '../api/messages';
import { truncateReply } from './ReplyButton';

function highlightSnippet(text, query) {
  if (!text || !query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return truncateReply(text, 120);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 50);
  const slice = text.slice(start, end);
  const relIdx = slice.toLowerCase().indexOf(q);
  if (relIdx < 0) return truncateReply(text, 120);
  return (
    <>
      {start > 0 && '…'}
      {slice.slice(0, relIdx)}
      <mark className="bg-wa-accent/40 text-slate-50 rounded px-0.5">{slice.slice(relIdx, relIdx + query.length)}</mark>
      {slice.slice(relIdx + query.length)}
      {end < text.length && '…'}
    </>
  );
}

export default function ChatMessageSearch({ roomId, onJumpToMessage, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setError('');
      return undefined;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchRoomMessages(roomId, q);
        setResults(data.messages || []);
        setError('');
      } catch {
        setResults([]);
        setError('Search failed');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, roomId]);

  return (
    <div className="border-b border-wa-border bg-wa-panel shrink-0">
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in this chat…"
          className="flex-1 px-3 py-2 bg-wa-surface border border-wa-border rounded-lg text-sm outline-none focus:border-wa-accent"
        />
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface shrink-0"
          aria-label="Close search"
        >
          ✕
        </button>
      </div>
      {query.trim().length > 0 && (
        <div className="max-h-48 overflow-y-auto px-2 pb-2">
          {loading && <p className="text-xs text-wa-muted px-2 py-2">Searching…</p>}
          {!loading && error && <p className="text-xs text-red-400 px-2 py-2">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="text-xs text-wa-muted px-2 py-2">No messages match &ldquo;{query.trim()}&rdquo;</p>
          )}
          {results.map((msg) => (
            <button
              key={msg.id}
              type="button"
              onClick={() => onJumpToMessage(msg.id)}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-wa-surface transition-colors"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-wa-muted">
                <span className="font-semibold text-wa-accent-hover">{msg.username}</span>
                <span>{new Date(msg.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-200 mt-0.5 line-clamp-2">
                {highlightSnippet(msg.content, query.trim())}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
