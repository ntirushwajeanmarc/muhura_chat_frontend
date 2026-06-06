import React, { useState, useEffect } from 'react';
import { fetchGroupMembers } from '../api/chats';
import Avatar from './Avatar';

export default function GroupProfileModal({ room, onClose, onAddMembers, onViewProfile }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!room?.id) return;
    setLoading(true);
    fetchGroupMembers(room.id)
      .then(setMembers)
      .catch(() => setError('Could not load members'))
      .finally(() => setLoading(false));
  }, [room?.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{room?.display_name || room?.name}</h2>
            <p className="text-xs text-wa-muted mt-0.5">
              {members.length || room?.member_count || 0} members
            </p>
          </div>
          <button type="button" className="text-wa-muted hover:text-slate-200 px-2 shrink-0" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="px-5 py-3 border-b border-wa-border shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onAddMembers?.();
            }}
            className="w-full py-2.5 rounded-xl bg-wa-accent hover:bg-wa-accent-hover text-white text-sm font-semibold"
          >
            + Add members
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-[200px]">
          {loading && <p className="text-center text-wa-muted py-8 text-sm">Loading members…</p>}
          {error && <p className="text-center text-red-400 py-4 text-sm">{error}</p>}
          {!loading && !error && (
            <ul className="space-y-1">
              {members.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-wa-surface text-left transition-colors"
                    onClick={() => onViewProfile?.(member.id)}
                  >
                    <Avatar
                      username={member.username}
                      color={member.avatar_color}
                      avatarUrl={member.avatar_url}
                      size={44}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {member.surname ? `${member.username} ${member.surname}` : member.username}
                      </p>
                      {member.phone && (
                        <p className="text-xs text-wa-muted truncate">{member.phone}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
