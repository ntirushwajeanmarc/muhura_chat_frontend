import React, { useState, useEffect } from 'react';
import { fetchAuthenticatedBlob } from '../utils/fileDownload';

export default function AuthenticatedImage({ storedPath, alt, className, style, fallback }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storedPath) return undefined;
    let objectUrl = null;
    let cancelled = false;

    fetchAuthenticatedBlob(storedPath)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storedPath]);

  if (error) {
    return fallback || <span className="text-xs text-wa-muted">Image unavailable</span>;
  }

  if (!blobUrl) {
    return (
      <div
        className={`animate-pulse bg-wa-surface rounded-md ${className || ''}`}
        style={style}
      />
    );
  }

  return <img src={blobUrl} alt={alt} className={className} style={style} />;
}
