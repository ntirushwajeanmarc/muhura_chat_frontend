import React from 'react';

export default function Avatar({ username, color, size = 36, className = '' }) {
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
