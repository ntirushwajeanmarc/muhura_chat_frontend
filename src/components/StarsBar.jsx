import React from 'react';
import Avatar from './Avatar';
import { hasUnseenStars } from '../utils/starSeen';

function StarRing({ children, active, unseen }) {
  const ringClass = unseen
    ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-500 p-[2.5px]'
    : active
      ? 'bg-wa-muted/60 p-[2px]'
      : 'bg-wa-border p-[2px]';

  return (
    <div className={`rounded-full shrink-0 ${ringClass}`}>
      <div className="rounded-full bg-wa-dark p-[2px]">{children}</div>
    </div>
  );
}

export default function StarsBar({ feed, viewerId, onCreate, onViewUser, compact = false }) {
  if (!feed?.length && compact) return null;

  return (
    <div className={`shrink-0 border-b border-wa-border ${compact ? 'px-1 py-2' : 'px-2 py-3'}`}>
      {!compact && (
        <div className="text-[11px] font-semibold text-wa-muted tracking-wider px-1 pb-2">STARS</div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
        {(() => {
          const myItem = feed.find((item) => item.is_me);
          const myHasStars = myItem?.stars?.length > 0;
          if (myHasStars) {
            return (
              <div className="flex flex-col items-center gap-1 shrink-0 relative">
                <button
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onClick={() => onViewUser(myItem)}
                  title="View your stars"
                >
                  <StarRing active unseen={hasUnseenStars(viewerId, myItem.stars)}>
                    <Avatar
                      username={myItem.user.username}
                      color={myItem.user.avatar_color}
                      avatarUrl={myItem.user.avatar_url}
                      size={48}
                    />
                  </StarRing>
                  <span className="text-[10px] text-wa-muted max-w-[52px] truncate">You</span>
                </button>
                <button
                  type="button"
                  className="absolute top-0 right-0 w-5 h-5 rounded-full bg-wa-accent text-white text-xs flex items-center justify-center border-2 border-wa-dark"
                  onClick={onCreate}
                  title="Post new star"
                >
                  +
                </button>
              </div>
            );
          }
          return (
            <button
              type="button"
              className="flex flex-col items-center gap-1 shrink-0"
              onClick={onCreate}
              title="Post a star"
            >
              <StarRing active={false} unseen={false}>
                <div className="w-12 h-12 rounded-full bg-wa-surface flex items-center justify-center text-xl border border-dashed border-wa-border">
                  +
                </div>
              </StarRing>
              <span className="text-[10px] text-wa-muted max-w-[52px] truncate">Your star</span>
            </button>
          );
        })()}

        {feed.map((item) => {
          if (item.is_me) return null;
          const hasStars = item.stars?.length > 0;
          const unseen = hasUnseenStars(viewerId, item.stars);
          return (
            <button
              key={item.user.id}
              type="button"
              className="flex flex-col items-center gap-1 shrink-0"
              onClick={() => hasStars && onViewUser(item)}
              disabled={!hasStars}
              title={hasStars ? `View ${item.user.username}'s stars` : 'No active stars'}
            >
              <StarRing active={hasStars} unseen={unseen && hasStars}>
                <Avatar
                  username={item.user.username}
                  color={item.user.avatar_color}
                  avatarUrl={item.user.avatar_url}
                  size={48}
                />
              </StarRing>
              <span className="text-[10px] text-wa-muted max-w-[52px] truncate">
                {item.user.username}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
