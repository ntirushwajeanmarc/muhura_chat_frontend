import React, { useState } from 'react';
import ModalCloseBtn from './ModalCloseBtn';
import { createChannel } from '../api/chats';

const inputClass =
  'w-full px-3.5 py-2.5 bg-wa-surface border border-wa-border rounded-lg text-slate-100 text-sm outline-none focus:border-wa-accent';

function previewName(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CreateChannelModal({ onCreate, onClose, initialName = '' }) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const slug = previewName(name);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!slug || slug.length < 2) {
      setError('Channel name must be at least 2 characters');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const room = await createChannel({ name, description: description.trim() || undefined });
      onCreate(room);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create channel');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h2 className="text-lg font-semibold">New channel</h2>
          <ModalCloseBtn onClick={onClose} />
        </div>

        <form onSubmit={handleCreate} className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-wa-muted mb-1.5">Channel name</label>
            <input
              type="text"
              placeholder="e.g. physics-101"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              maxLength={50}
            />
            {name.trim() && (
              <p className="text-xs text-wa-muted mt-1.5">
                Will appear as <span className="text-slate-300 font-medium">#{slug || '…'}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-wa-muted mb-1.5">Description (optional)</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="What is this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={255}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={creating || !slug || slug.length < 2}
            className="w-full py-2.5 rounded-lg bg-wa-accent hover:bg-wa-accent-hover text-white text-sm font-semibold disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create channel'}
          </button>
        </form>
      </div>
    </div>
  );
}
