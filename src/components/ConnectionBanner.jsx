import React from 'react';

export default function ConnectionBanner({ connected, reconnecting, offline }) {
  if (connected && !offline) return null;

  let message = 'Reconnecting…';
  let className = 'bg-amber-900/95 border-amber-600/40 text-amber-100';

  if (offline) {
    message = 'You are offline. Messages will be sent when you reconnect.';
    className = 'bg-red-900/95 border-red-600/40 text-red-100';
  } else if (!reconnecting && !connected) {
    message = 'Not connected to chat server.';
    className = 'bg-red-900/95 border-red-600/40 text-red-100';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`shrink-0 px-3 py-2 text-center text-xs sm:text-sm border-b ${className}`}
    >
      {message}
    </div>
  );
}
