import React, { useState, useEffect, useRef } from 'react';
import { searchChannels, joinChannel } from '../api/chats';

export default function ChannelSearchModal({ onJoin, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return undefined;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const channels = await searchChannels(trimmed);
        setResults(channels);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleJoin = async (channel) => {
    if (channel.joined) {
      onJoin(channel);
      onClose();
      return;
    }
    setJoiningId(channel.id);
    setError('');
    try {
      const room = await joinChannel(channel.id);
      onJoin(room);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not join channel');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h2 className="text-lg font-semibold">Find a channel</h2>
          <button type="button" className="text-wa-muted hover:text-slate-200 px-2" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-4 pt-3">
          <input
            ref={inputRef}
            className="w-full px-3.5 py-2.5 bg-wa-surface border border-wa-border rounded-lg text-sm outline-none focus:border-wa-accent"
            type="text"
            placeholder="Search channels by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && (
          <p className="mx-4 mt-2 text-sm text-red-400">{error}</p>
        )}

        <div className="flex-1 overflow-y-auto p-2 min-h-[200px] max-h-[360px]">
          {query.trim().length < 1 && (
            <p className="text-center text-wa-muted text-sm py-4">
              Search to discover channels. Only channels you join or have posted in appear in your list.
            </p>
          )}
          {query.trim().length > 0 && !loading && results.length === 0 && (
            <p className="text-center text-wa-muted text-sm py-4">No channels found</p>
          )}
          {results.map((channel) => (
            <button
              key={channel.id}
              type="button"
              disabled={joiningId === channel.id}
              className="flex items-center gap-3 w-full p-2.5 rounded-lg text-left hover:bg-wa-surface disabled:opacity-50"
              onClick={() => handleJoin(channel)}
            >
              <span className="w-10 h-10 rounded-full bg-wa-surface flex items-center justify-center text-lg shrink-0">
                #
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{channel.name}</div>
                {channel.description && (
                  <div className="text-xs text-wa-muted truncate">{channel.description}</div>
                )}
              </div>
              <span className="text-xs text-wa-accent shrink-0">
                {channel.joined ? 'Open' : joiningId === channel.id ? '…' : 'Join'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
