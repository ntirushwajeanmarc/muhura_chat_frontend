import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { secureFileUrl } from '../utils/assetUrl';

export default function AuthenticatedImage({ storedPath, alt, className, style, fallback }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!storedPath) return undefined;
    let objectUrl = null;

    axios
      .get(secureFileUrl(storedPath), { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
        setError(false);
      })
      .catch(() => setError(true));

    return () => {
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
