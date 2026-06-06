import React, { useEffect, useState } from 'react';
import { wallpaperClass } from '../utils/wallpapers';
import { fetchAuthenticatedBlob } from '../utils/fileDownload';

export default function ChatWallpaper({ user, className = '', children, innerRef }) {
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
  const style = isCustom && customUrl
    ? {
        backgroundImage: `url(${customUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : undefined;

  return (
    <div ref={innerRef} className={`${presetClass} ${className}`} style={style}>
      {children}
    </div>
  );
}
