import React, { useState } from 'react';
import { toggleMessageLike } from '../api/likes';

const btnClass =
  'flex items-center gap-0.5 rounded-md px-1 py-0.5 text-xs transition-colors';

export default function MessageLikeButton({ messageId, likes, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const count = likes?.count || 0;
  const liked = likes?.liked_by_me || false;

  const handleClick = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const data = await toggleMessageLike(messageId);
      onUpdate?.({
        count: data.like_count,
        liked_by_me: data.liked,
      });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`${btnClass} ${liked ? 'text-pink-400 hover:text-pink-300' : 'text-wa-muted hover:text-pink-400'}`}
      onClick={handleClick}
      disabled={busy}
      title={liked ? 'Unlike' : 'Like'}
      aria-label={liked ? 'Unlike message' : 'Like message'}
    >
      <span>{liked ? '❤️' : '🤍'}</span>
      {count > 0 && <span className="font-semibold">{count}</span>}
    </button>
  );
}
