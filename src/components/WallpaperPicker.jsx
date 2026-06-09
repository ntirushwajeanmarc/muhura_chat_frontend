import React, { useState, useRef } from 'react';
import ModalCloseBtn from './ModalCloseBtn';
import { useAuth } from '../context/AuthContext';
import { WALLPAPERS } from '../utils/wallpapers';
import { updateProfile, uploadWallpaper } from '../api/profile';
import { clearImageCache } from '../utils/fileDownload';
import CircularProgress from './CircularProgress';

export default function WallpaperPicker({ current, onSelect, onClose, updateSession }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

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

  const handleGalleryPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image from your gallery');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      if (user?.id) clearImageCache(`/wallpapers/user/${user.id}`);
      const data = await uploadWallpaper(file, setUploadProgress);
      if (data?.user && updateSession) {
        updateSession(data.user, data.token);
      }
      onSelect('custom');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload photo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
          <ModalCloseBtn onClick={onClose} />
        </div>

        {error && <p className="px-5 pt-3 text-sm text-red-400">{error}</p>}

        <div className="p-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGalleryPick}
          />
          <button
            type="button"
            disabled={saving || uploading}
            onClick={() => fileRef.current?.click()}
            className="w-full mb-4 flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-wa-accent/50 hover:border-wa-accent hover:bg-wa-accent/5 transition-colors disabled:opacity-50"
          >
            <span className="w-12 h-12 rounded-xl bg-wa-surface flex items-center justify-center text-2xl shrink-0">
              🖼
            </span>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">Choose from gallery</p>
              <p className="text-xs text-wa-muted mt-0.5">Use a photo from your device</p>
            </div>
            {uploading && (
              <CircularProgress value={uploadProgress} size={36} />
            )}
          </button>

          <p className="text-xs text-wa-muted mb-3">Or pick a preset</p>
          <div className="grid grid-cols-2 gap-3">
            {WALLPAPERS.map((wp) => (
              <button
                key={wp.id}
                type="button"
                disabled={saving || uploading}
                onClick={() => handleSelect(wp.id)}
                className={`rounded-xl border-2 overflow-hidden text-left transition-colors disabled:opacity-50 ${
                  current === wp.id ? 'border-wa-accent' : 'border-wa-border hover:border-wa-muted'
                }`}
              >
                <div className={`h-20 ${wp.className}`} />
                <div className="px-3 py-2 text-sm font-medium">{wp.label}</div>
              </button>
            ))}
            {current === 'custom' && (
              <div className="rounded-xl border-2 border-wa-accent overflow-hidden text-left col-span-2">
                <div className="h-20 chat-wallpaper-custom flex items-center justify-center text-wa-muted text-xs">
                  Your gallery photo
                </div>
                <div className="px-3 py-2 text-sm font-medium text-wa-accent">Custom (active)</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
