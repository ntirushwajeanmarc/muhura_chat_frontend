import React, { useState } from 'react';
import { WALLPAPERS } from '../utils/wallpapers';
import { updateProfile } from '../api/profile';

export default function WallpaperPicker({ current, onSelect, onClose, updateSession }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (id) => {
    setSaving(true);
    setError('');
    try {
      const data = await updateProfile({ chat_wallpaper: id });
      if (data?.user && updateSession) {
        updateSession(data.user, data.token);
      }
      onSelect(id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save wallpaper');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h2 className="text-lg font-semibold">Chat wallpaper</h2>
          <button type="button" className="text-wa-muted hover:text-slate-200 px-2" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <p className="px-5 pt-3 text-sm text-red-400">{error}</p>}

        <div className="p-4 grid grid-cols-2 gap-3">
          {WALLPAPERS.map((wp) => (
            <button
              key={wp.id}
              type="button"
              disabled={saving}
              onClick={() => handleSelect(wp.id)}
              className={`rounded-xl border-2 overflow-hidden text-left transition-colors disabled:opacity-50 ${
                current === wp.id ? 'border-wa-accent' : 'border-wa-border hover:border-wa-muted'
              }`}
            >
              <div className={`h-20 ${wp.className}`} />
              <div className="px-3 py-2 text-sm font-medium">{wp.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
