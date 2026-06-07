import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchFollowers, fetchFollowing } from '../api/social';
import Avatar from './Avatar';

export default function FollowListModal({ userId, type, title, onClose, onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId || !type) return;
    setLoading(true);
    setError('');
    const load = type === 'followers' ? fetchFollowers : fetchFollowing;
    load(userId)
      .then((list) => setUsers(list))
      .catch(() => setError('Could not load list'))
      .finally(() => setLoading(false));
  }, [userId, type]);

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-sm shadow-2xl max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="text-wa-muted hover:text-slate-200 px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {loading && <p className="text-wa-muted text-sm text-center py-8">Loading…</p>}
          {error && <p className="text-red-400 text-sm text-center py-8">{error}</p>}
          {!loading && !error && users.length === 0 && (
            <p className="text-wa-muted text-sm text-center py-8">
              {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </p>
          )}
          {!loading && !error && users.map((u) => (
            <button
              key={u.id}
              type="button"
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-wa-surface/70 text-left transition-colors"
              onClick={() => onSelectUser?.(u.id)}
            >
              <Avatar
                username={u.username}
                color={u.avatar_color}
                avatarUrl={u.avatar_url}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {u.surname ? `${u.username} ${u.surname}` : u.username}
                </p>
                <p className="text-xs text-wa-muted truncate">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
