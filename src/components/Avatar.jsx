import React from 'react';
import AuthenticatedImage from './AuthenticatedImage';

export default function Avatar({ username, color, avatarUrl, size = 36, className = '', onPhotoClick }) {
  if (avatarUrl) {
    const image = (
      <AuthenticatedImage
        storedPath={avatarUrl}
        alt={username || 'User'}
        allowExpand={false}
        className={`rounded-full object-cover shrink-0 ${onPhotoClick ? '' : 'pointer-events-none'} ${className}`}
        style={{ width: size, height: size }}
        loadingClassName={`animate-pulse bg-wa-surface rounded-full shrink-0 ${className}`}
        fallback={
          <div
            className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
            style={{
              width: size,
              height: size,
              background: color || '#25d366',
              fontSize: size * 0.4,
            }}
          >
            {username?.[0]?.toUpperCase()}
          </div>
        }
      />
    );

    if (onPhotoClick) {
      return (
        <button
          type="button"
          onClick={onPhotoClick}
          className={`rounded-full shrink-0 ring-0 hover:ring-2 hover:ring-wa-accent/60 focus-visible:ring-2 focus-visible:ring-wa-accent transition-shadow ${className}`}
          style={{ width: size, height: size }}
          aria-label={`View ${username || 'user'}'s profile photo`}
        >
          {image}
        </button>
      );
    }

    return image;
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: color || '#25d366',
        fontSize: size * 0.4,
      }}
    >
      {username?.[0]?.toUpperCase()}
    </div>
  );
}
