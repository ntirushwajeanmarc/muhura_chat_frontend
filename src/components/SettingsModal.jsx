import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProfile, updateProfile, uploadAvatar, removeAvatar, AVATAR_COLORS } from '../api/profile';
import Avatar from './Avatar';
import CircularProgress from './CircularProgress';

const inputClass =
  'w-full px-3.5 py-2.5 bg-wa-surface border border-wa-border rounded-lg text-slate-100 text-sm outline-none focus:border-wa-accent';

export default function SettingsModal({ onClose }) {
  const { user, updateSession } = useAuth();
  const [form, setForm] = useState({
    surname: '',
    phone: '',
    bio: '',
    avatar_color: '#25d366',
    avatar_url: null,
  });
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    fetchProfile()
      .then((profile) => {
        setForm({
          surname: profile.surname || '',
          phone: profile.phone || '',
          bio: profile.bio || '',
          avatar_color: profile.avatar_color || '#25d366',
          avatar_url: profile.avatar_url || null,
        });
        setEmail(profile.email);
        setUsername(profile.username);
      })
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false));
  }, []);

  const applySession = (data) => {
    if (data?.user) {
      updateSession(data.user, data.token);
      setForm((prev) => ({
        ...prev,
        avatar_url: data.user.avatar_url,
        avatar_color: data.user.avatar_color,
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = await updateProfile({
        surname: form.surname,
        phone: form.phone,
        bio: form.bio,
        avatar_color: form.avatar_color,
      });
      applySession(data);
      setSuccess('Profile saved');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');
    try {
      const data = await uploadAvatar(file, setUploadProgress);
      applySession(data);
      setSuccess('Photo updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemovePhoto = async () => {
    setError('');
    setSuccess('');
    try {
      const data = await removeAvatar();
      applySession(data);
      setSuccess('Photo removed');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove photo');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border shrink-0">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button type="button" className="text-wa-muted hover:text-slate-200 px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-wa-muted py-8">Loading profile…</p>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar
                    username={username || user?.username}
                    color={form.avatar_color}
                    avatarUrl={form.avatar_url}
                    size={96}
                  />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <CircularProgress progress={uploadProgress} size={56} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-50 rounded-lg text-white text-sm font-medium"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Change photo'}
                  </button>
                  {form.avatar_url && (
                    <button
                      type="button"
                      className="px-4 py-2 bg-wa-surface hover:bg-wa-border rounded-lg text-sm text-wa-muted"
                      onClick={handleRemovePhoto}
                      disabled={uploading}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-wa-muted mb-1.5">Username</label>
                <input type="text" className={`${inputClass} opacity-70`} value={username} readOnly />
              </div>

              <div>
                <label className="block text-xs font-medium text-wa-muted mb-1.5">Email</label>
                <input type="email" className={`${inputClass} opacity-70`} value={email} readOnly />
              </div>

              <div>
                <label className="block text-xs font-medium text-wa-muted mb-1.5">Surname</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Your surname"
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-wa-muted mb-1.5">Mobile number</label>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="+250 7XX XXX XXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-wa-muted mb-1.5">About</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  maxLength={200}
                  placeholder="A short bio (optional)"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
                <p className="text-xs text-wa-muted mt-1 text-right">{form.bio.length}/200</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-wa-muted mb-2">Avatar color (when no photo)</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${
                        form.avatar_color === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ background: c }}
                      onClick={() => setForm({ ...form, avatar_color: c })}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">{success}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-50 rounded-lg text-white font-semibold text-sm"
                disabled={saving || uploading}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
