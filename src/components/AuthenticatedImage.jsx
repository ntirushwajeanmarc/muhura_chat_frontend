import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAuthenticatedBlob } from '../utils/fileDownload';

export default function AuthenticatedImage({ storedPath, alt, className, style, fallback }) {
  const { token, loading: authLoading } = useAuth();
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadImage = useCallback(async (signal) => {
    if (!storedPath || !token) return;
    setLoading(true);
    setError(false);

    try {
      const blob = await fetchAuthenticatedBlob(storedPath);
      if (signal?.aborted) return;
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setError(false);
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [storedPath, token]);

  useEffect(() => {
    if (!storedPath || authLoading || !token) return undefined;

    const controller = new AbortController();
    loadImage(controller.signal);

    return () => {
      controller.abort();
    };
  }, [storedPath, token, authLoading, loadImage]);

  useEffect(() => () => {
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  if (error) {
    return (
      fallback || (
        <button
          type="button"
          className="text-sm text-wa-accent hover:underline"
          onClick={() => loadImage()}
        >
          Tap to load image
        </button>
      )
    );
  }

  if (loading || !blobUrl) {
    return (
      <div
        className={`animate-pulse bg-wa-surface rounded-md min-h-[120px] min-w-[160px] ${className || ''}`}
        style={style}
      />
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={`cursor-pointer ${className || ''}`}
      style={style}
      onClick={() => window.open(blobUrl, '_blank', 'noopener,noreferrer')}
    />
  );
}
