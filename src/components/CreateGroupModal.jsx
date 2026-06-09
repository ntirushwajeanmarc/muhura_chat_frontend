import React, { useState } from 'react';
import { X } from 'lucide-react';
import ModalCloseBtn from './ModalCloseBtn';
import UserSearchModal from './UserSearchModal';
import Avatar from './Avatar';

const inputClass =
  'w-full px-3.5 py-2.5 bg-wa-surface border border-wa-border rounded-lg text-slate-100 text-sm outline-none focus:border-wa-accent';

export default function CreateGroupModal({ onCreate, onClose }) {
  const [name, setName] = useState('');
  const [members, setMembers] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim(), members.map((m) => m.id));
      onClose();
    } catch {
      /* parent shows error if needed */
    } finally {
      setCreating(false);
    }
  };

  const removeMember = (id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  if (showSearch) {
    return (
      <UserSearchModal
        title="Add group members"
        multiSelect
        onConfirm={(users) => {
          setMembers((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            return [...prev, ...users.filter((u) => !ids.has(u.id))];
          });
          setShowSearch(false);
        }}
        onClose={() => setShowSearch(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h2 className="text-lg font-semibold">New group</h2>
          <ModalCloseBtn onClick={onClose} />
        </div>

        <form onSubmit={handleCreate} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-wa-muted mb-1.5">Group name</label>
            <input
              type="text"
              placeholder="e.g. Study group"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm text-wa-muted mb-2">
              <span>Members ({members.length + 1})</span>
              <button type="button" className="text-wa-accent font-semibold text-sm" onClick={() => setShowSearch(true)}>
                + Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-1.5 pl-1 pr-2 py-1 bg-wa-surface rounded-full text-sm">
                  <Avatar username={m.username} color={m.avatar_color} avatarUrl={m.avatar_url} size={28} />
                  <span>{m.username}</span>
                  <button type="button" className="text-wa-muted hover:text-slate-200 text-xs ml-1 inline-flex" onClick={() => removeMember(m.id)} aria-label="Remove">
                    <X size={14} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <span className="text-xs text-wa-muted">You will be added automatically</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-50 rounded-lg text-white font-semibold text-sm"
            disabled={creating || !name.trim()}
          >
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </form>
      </div>
    </div>
  );
}
