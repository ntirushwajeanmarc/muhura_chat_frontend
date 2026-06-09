import React from 'react';
import AuthenticatedImage from './AuthenticatedImage';

export default function Avatar({ username, color, avatarUrl, size = 36, className = '' }) {
  if (avatarUrl) {
    return (
      <AuthenticatedImage
        storedPath={avatarUrl}
        alt={username || 'User'}
        allowExpand={false}
        className={`rounded-full object-cover shrink-0 pointer-events-none ${className}`}
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
