import React, { useRef, useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import ModalCloseBtn from './ModalCloseBtn';
import { fetchGroupMembers, uploadGroupAvatar } from '../api/chats';
import Avatar from './Avatar';
import { clearImageCache } from '../utils/fileDownload';

export default function GroupProfileModal({
  room,
  isAdmin,
  onClose,
  onAddMembers,
  onViewProfile,
  onAvatarUpdated,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(room?.avatar_url || null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    setAvatarUrl(room?.avatar_url || null);
  }, [room?.avatar_url, room?.id]);

  useEffect(() => {
    if (!room?.id) return;
    setLoading(true);
    fetchGroupMembers(room.id)
      .then(setMembers)
      .catch(() => setError('Could not load members'))
      .finally(() => setLoading(false));
  }, [room?.id]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !room?.id) return;

    setUploading(true);
    setError('');
    try {
      const data = await uploadGroupAvatar(room.id, file);
      const nextUrl = data.avatar_url || null;
      if (room.avatar_url) clearImageCache(room.avatar_url);
      if (nextUrl) clearImageCache(nextUrl);
      setAvatarUrl(nextUrl);
      onAvatarUpdated?.(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload group photo');
    } finally {
      setUploading(false);
    }
  };

  const groupName = room?.display_name || room?.name || 'Group';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">{groupName}</h2>
            <p className="text-xs text-wa-muted mt-0.5">
              {members.length || room?.member_count || 0} members
            </p>
          </div>
          <ModalCloseBtn onClick={onClose} className="text-wa-muted hover:text-slate-200 px-2 shrink-0 inline-flex items-center justify-center" />
        </div>

        <div className="px-5 py-4 border-b border-wa-border shrink-0 flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              username={groupName}
              color={room?.avatar_color || '#00a884'}
              avatarUrl={avatarUrl}
              size={88}
            />
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-wa-accent text-white flex items-center justify-center shadow-lg hover:bg-wa-accent-hover disabled:opacity-60"
                  title="Change group photo"
                  aria-label="Change group photo"
                >
                  <Camera size={16} strokeWidth={1.75} aria-hidden />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </>
            )}
          </div>
          {uploading && <p className="text-xs text-wa-muted">Uploading photo…</p>}
          {isAdmin ? (
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
          ) : (
            <p className="text-xs text-wa-muted text-center">Only admins can add members or change the group photo</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-[200px]">
          {error && <p className="text-center text-red-400 py-2 text-sm">{error}</p>}
          {loading && <p className="text-center text-wa-muted py-8 text-sm">Loading members…</p>}
          {!loading && (
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
                        {member.role === 'admin' && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-wa-accent">
                            Admin
                          </span>
                        )}
                      </p>
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
