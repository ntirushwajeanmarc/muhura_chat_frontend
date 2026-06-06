import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserProfile, toggleProfileLike } from '../api/likes';
import { toggleFollow } from '../api/social';
import Avatar from './Avatar';

export default function ProfileModal({ userId, onClose, onEditProfile, onCall }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [likeBusy, setLikeBusy] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [error, setError] = useState('');

  const isOwn = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchUserProfile(userId)
      .then((data) => setProfile(data.user))
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    if (isOwn || followBusy) return;
    setFollowBusy(true);
    setError('');
    try {
      const data = await toggleFollow(userId);
      setProfile((prev) => ({
        ...prev,
        followed_by_me: data.following,
        follower_count: data.follower_count,
      }));
    } catch {
      setError('Could not update follow');
    } finally {
      setFollowBusy(false);
    }
  };

  const handleLike = async () => {
    if (isOwn || likeBusy) return;
    setLikeBusy(true);
    setError('');
    try {
      const data = await toggleProfileLike(userId);
      setProfile((prev) => ({
        ...prev,
        like_count: data.like_count,
        liked_by_me: data.liked,
      }));
    } catch {
      setError('Could not update like');
    } finally {
      setLikeBusy(false);
    }
  };

  const displayName = profile?.surname
    ? `${profile.username} ${profile.surname}`
    : profile?.username;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <div
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h2 className="text-lg font-semibold">Profile</h2>
          <button type="button" className="text-wa-muted hover:text-slate-200 px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          {loading ? (
            <p className="text-wa-muted py-8">Loading…</p>
          ) : error ? (
            <p className="text-red-400 py-4">{error}</p>
          ) : profile ? (
            <>
              <Avatar
                username={profile.username}
                color={profile.avatar_color}
                avatarUrl={profile.avatar_url}
                size={96}
              />
              <div className="text-center">
                <h3 className="text-xl font-bold">{displayName}</h3>
                {profile.surname && (
                  <p className="text-sm text-wa-muted">@{profile.username}</p>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-slate-300 text-center whitespace-pre-wrap">{profile.bio}</p>
              )}
              {profile.phone && (
                <p className="text-sm text-wa-muted">📱 {profile.phone}</p>
              )}
              <div className="flex items-center gap-4 pt-2 flex-wrap justify-center">
                <span className="text-sm text-wa-muted">
                  <span className="font-semibold text-slate-200">{profile.follower_count || 0}</span>
                  {' '}followers
                </span>
                <span className="text-sm text-wa-muted">
                  <span className="font-semibold text-slate-200">{profile.following_count || 0}</span>
                  {' '}following
                </span>
                <span className="text-sm text-wa-muted">
                  <span className="font-semibold text-pink-400">{profile.like_count || 0}</span>
                  {' '}likes
                </span>
              </div>
              {isOwn ? (
                <button
                  type="button"
                  className="w-full py-2.5 bg-wa-accent hover:bg-wa-accent-hover rounded-lg text-white text-sm font-semibold"
                  onClick={() => {
                    onClose();
                    onEditProfile?.();
                  }}
                >
                  Edit profile
                </button>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      profile.followed_by_me
                        ? 'bg-wa-surface text-slate-200 border border-wa-border hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/40'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                    onClick={handleFollow}
                    disabled={followBusy}
                    title={profile.followed_by_me ? 'Tap to unfollow' : 'Follow this user'}
                  >
                    {followBusy ? '…' : profile.followed_by_me ? 'Unfollow' : 'Follow'}
                  </button>
                  {onCall && (
                    <button
                      type="button"
                      className="w-full py-2.5 bg-wa-surface hover:bg-wa-border border border-wa-border rounded-lg text-slate-200 text-sm font-semibold"
                      onClick={() => {
                        onCall(profile);
                        onClose();
                      }}
                    >
                      📞 Voice call
                    </button>
                  )}
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      profile.liked_by_me
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/40'
                        : 'bg-wa-accent hover:bg-wa-accent-hover text-white'
                    }`}
                    onClick={handleLike}
                    disabled={likeBusy}
                    title={profile.liked_by_me ? 'Tap to unlike' : 'Like this profile'}
                  >
                    {likeBusy ? '…' : profile.liked_by_me ? '❤️ Unlike' : '🤍 Like profile'}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
