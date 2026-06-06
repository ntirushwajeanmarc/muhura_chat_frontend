import React, { useEffect, useState } from 'react';
import { wallpaperClass } from '../utils/wallpapers';
import { fetchAuthenticatedBlob } from '../utils/fileDownload';

export default function ChatWallpaper({ user, scrollClassName = '', children, innerRef }) {
  const [customUrl, setCustomUrl] = useState(null);
  const isCustom = user?.chat_wallpaper === 'custom';

  useEffect(() => {
    let revoked = null;
    if (!isCustom || !user?.id) {
      setCustomUrl(null);
      return undefined;
    }
    let cancelled = false;
    fetchAuthenticatedBlob(`/wallpapers/user/${user.id}`)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setCustomUrl(url);
      })
      .catch(() => {
        if (!cancelled) setCustomUrl(null);
      });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [isCustom, user?.id]);

  const presetClass = !isCustom ? wallpaperClass(user?.chat_wallpaper || 'default') : 'chat-wallpaper-custom';

  return (
    <div className={`relative flex-1 min-h-0 flex flex-col ${presetClass}`}>
      {isCustom && customUrl && (
        <img
          src={customUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
        />
      )}
      <div
        ref={innerRef}
        className={`relative z-[1] flex-1 min-h-0 overflow-y-auto overscroll-contain ${scrollClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
