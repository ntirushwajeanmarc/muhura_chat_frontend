import React, { useState } from 'react';
import { downloadAuthenticatedFile } from '../utils/fileDownload';
import { isImageAttachment } from '../utils/imageAttachment';
import AuthenticatedImage from './AuthenticatedImage';

function fileIcon(mime) {
  if (mime?.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime?.includes('word')) return '📝';
  if (mime?.includes('sheet') || mime?.includes('excel')) return '📊';
  if (mime?.includes('presentation') || mime?.includes('powerpoint')) return '📽️';
  if (mime === 'application/zip') return '📦';
  return '📎';
}

export default function MessageAttachment({ attachment }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  if (!attachment?.url) return null;

  const isImage = isImageAttachment(attachment);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadAuthenticatedFile(attachment.url, attachment.name);
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (isImage) {
    return (
      <div className="mb-1.5">
        <AuthenticatedImage
          storedPath={attachment.url}
          alt={attachment.name || 'Shared image'}
          className="max-w-full max-h-48 sm:max-h-72 rounded-md object-contain"
        />
        <button
          type="button"
          className="inline-block mt-1 text-xs text-wa-muted hover:text-wa-accent hover:underline disabled:opacity-50"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading…' : 'Save image'}
        </button>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-slate-100 w-full text-left disabled:opacity-60"
      >
        <span className="text-2xl shrink-0">{fileIcon(attachment.mime)}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate">
            {attachment.name || 'Download file'}
          </span>
          <span className="block text-xs text-wa-muted">
            {downloading ? 'Downloading…' : 'Tap to download'}
          </span>
        </span>
        <span className="text-wa-accent text-sm shrink-0">{downloading ? '…' : '⬇'}</span>
      </button>
      {error && <p className="mt-1 text-xs text-red-400 px-1">{error}</p>}
    </div>
  );
}
