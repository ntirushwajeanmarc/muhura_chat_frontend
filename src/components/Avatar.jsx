import React from 'react';
import { BACKEND_URL } from '../config';

export default function Avatar({ username, color, avatarUrl, size = 36, className = '' }) {
  if (avatarUrl) {
    const src = avatarUrl.startsWith('http') ? avatarUrl : `${BACKEND_URL}${avatarUrl}`;
    return (
      <img
        src={src}
        alt={username || 'User'}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
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
