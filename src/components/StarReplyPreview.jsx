import React from 'react';
import { Star } from 'lucide-react';
import AuthenticatedImage from './AuthenticatedImage';
import { truncateReply } from './ReplyButton';

export default function StarReplyPreview({ starReply, className = '' }) {
  if (!starReply) return null;

  const label = starReply.content
    ? truncateReply(starReply.content, 80)
    : starReply.image_url
      ? 'Photo star'
      : 'Star';

  return (
    <div
      className={`flex gap-2 p-2 mb-2 rounded-lg bg-black/25 border-l-[3px] border-amber-400/90 text-left ${className}`}
    >
      {starReply.image_url ? (
        <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-black/30">
          <AuthenticatedImage
            storedPath={starReply.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-md shrink-0 bg-amber-500/20 flex items-center justify-center">
          <Star size={16} className="text-amber-400" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-amber-300/95 flex items-center gap-1">
          <Star size={10} className="shrink-0" aria-hidden />
          {starReply.username}&apos;s star
        </p>
        <p className="text-xs text-wa-muted line-clamp-2 break-words">{label}</p>
      </div>
    </div>
  );
}
