import React, { useState } from 'react';
import UserSearchModal from './UserSearchModal';

const Avatar = ({ username, color, size = 28 }) => (
  <div
    className="user-avatar"
    style={{
      width: size,
      height: size,
      background: color || '#25d366',
      fontSize: size * 0.4,
    }}
  >
    {username?.[0]?.toUpperCase()}
  </div>
);

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New group</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} className="group-form">
          <div className="field">
            <label>Group name</label>
            <input
              type="text"
              placeholder="e.g. Study group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="group-members-section">
            <div className="group-members-header">
              <span>Members ({members.length + 1})</span>
              <button
                type="button"
                className="group-add-btn"
                onClick={() => setShowSearch(true)}
              >
                + Add
              </button>
            </div>
            <div className="group-members-list">
              {members.map((m) => (
                <div key={m.id} className="group-member-chip">
                  <Avatar username={m.username} color={m.avatar_color} />
                  <span>{m.username}</span>
                  <button type="button" onClick={() => removeMember(m.id)} aria-label="Remove">
                    ✕
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <span className="modal-hint">You will be added automatically</span>
              )}
            </div>
          </div>

          <button type="submit" className="modal-confirm-btn full-width" disabled={creating || !name.trim()}>
            {creating ? 'Creating…' : 'Create group'}
          </button>
        </form>
      </div>
    </div>
  );
}
