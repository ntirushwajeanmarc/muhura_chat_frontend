import React, { useState, useEffect, useRef } from 'react';
import { searchUsers } from '../api/chats';

const Avatar = ({ username, color, size = 36 }) => (
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
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await searchUsers(query.trim());
        setResults(users);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <input
          ref={inputRef}
          className="modal-search"
          type="text"
          placeholder="Search by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="modal-results">
          {loading && <div className="modal-hint">Searching…</div>}
          {!loading && query.trim() && results.length === 0 && (
            <div className="modal-hint">No users found</div>
          )}
          {!loading && !query.trim() && (
            <div className="modal-hint">Type a username to search</div>
          )}
          {results.map((user) => {
            const isSelected = selected.some((u) => u.id === user.id);
            return (
              <button
                key={user.id}
                type="button"
                className={`modal-user-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleUser(user)}
              >
                <Avatar username={user.username} color={user.avatar_color} size={40} />
                <span className="modal-user-name">{user.username}</span>
                {multiSelect && isSelected && <span className="modal-check">✓</span>}
              </button>
            );
          })}
        </div>

        {multiSelect && (
          <div className="modal-footer">
            <span className="modal-selected-count">
              {selected.length} selected
            </span>
            <button
              type="button"
              className="modal-confirm-btn"
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
