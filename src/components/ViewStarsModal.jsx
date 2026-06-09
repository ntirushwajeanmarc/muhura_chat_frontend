import React, { useState, useEffect, useCallback, useRef } from 'react';
import AuthenticatedImage from './AuthenticatedImage';
import Avatar from './Avatar';
import { markStarsSeen } from '../utils/starSeen';
import MessageContent from './MessageContent';

const SLIDE_MS = 6000;

export default function ViewStarsModal({ feedItem, viewerId, onClose, onDelete }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());

  const stars = feedItem?.stars || [];
  const current = stars[index];
  const isOwn = feedItem?.is_me;

  const goNext = useCallback(() => {
    if (index < stars.length - 1) {
      setIndex((i) => i + 1);
      setProgress(0);
      startRef.current = Date.now();
    } else {
      if (viewerId && stars.length) {
        markStarsSeen(viewerId, stars.map((s) => s.id));
      }
      onClose();
    }
  }, [index, stars, viewerId, onClose]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setProgress(0);
      startRef.current = Date.now();
    }
  }, [index]);

  useEffect(() => {
    if (!current) return undefined;
    startRef.current = Date.now();
    setProgress(0);

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsed / SLIDE_MS) * 100);
      setProgress(pct);
      if (elapsed >= SLIDE_MS) goNext();
    };

    timerRef.current = setInterval(tick, 50);
    return () => clearInterval(timerRef.current);
  }, [current, index, goNext]);

  useEffect(() => {
    return () => {
      if (viewerId && stars.length) {
        markStarsSeen(viewerId, stars.map((s) => s.id));
      }
    };
  }, [viewerId, stars]);

  if (!feedItem || !current) return null;

  const displayName = feedItem.user?.surname
    ? `${feedItem.user.username} ${feedItem.user.surname}`
    : feedItem.user?.username;

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col">
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {current.image_url ? (
            <AuthenticatedImage
              storedPath={current.image_url}
              alt=""
              allowExpand={false}
              className="w-full h-full object-contain"
              style={{ maxHeight: '100%' }}
              loadingClassName="w-full h-full flex items-center justify-center bg-black"
              fallback={
                <div className="flex flex-col items-center justify-center gap-3 text-white/60 p-8">
                  <span className="text-4xl">⭐</span>
                  <span className="text-sm">Could not load star image</span>
                </div>
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8">
              {current.content ? (
                <div className="text-white text-center text-xl leading-relaxed max-w-md">
                  <MessageContent content={current.content} />
                </div>
              ) : (
                <p className="text-white/50">Empty star</p>
              )}
            </div>
          )}
        </div>

        {current.content && current.image_url && (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 pt-16 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
            <div className="text-white text-center text-lg leading-relaxed max-w-md mx-auto">
              <MessageContent content={current.content} />
            </div>
          </div>
        )}

        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 w-1/3 z-30"
          onClick={goPrev}
          aria-label="Previous"
        />
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 w-1/3 z-30"
          onClick={goNext}
          aria-label="Next"
        />

        <div className="absolute top-0 left-0 right-0 z-40 px-3 pt-3 pb-10 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <div className="flex gap-1 mb-3 pointer-events-auto">
            {stars.map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            <Avatar
              username={feedItem.user?.username}
              color={feedItem.user?.avatar_color}
              avatarUrl={feedItem.user?.avatar_url}
              size={32}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-white/60">
                {new Date(current.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button
              type="button"
              className="text-white/80 hover:text-white px-2 text-xl"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {isOwn && (
        <div className="shrink-0 p-4 flex justify-center border-t border-white/10 bg-black">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm"
            onClick={() => onDelete?.(current.id)}
          >
            Delete star
          </button>
        </div>
      )}
    </div>
  );
}
