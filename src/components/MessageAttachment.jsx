import React, { useState } from 'react';
import {
  Image,
  FileText,
  FileSpreadsheet,
  Presentation,
  Archive,
  Paperclip,
  Download,
} from 'lucide-react';
import { downloadAuthenticatedFile } from '../utils/fileDownload';
import { isImageAttachment } from '../utils/imageAttachment';
import AuthenticatedImage from './AuthenticatedImage';

function FileTypeIcon({ mime, className = 'text-wa-accent' }) {
  const props = { size: 28, strokeWidth: 1.5, className, 'aria-hidden': true };
  if (mime?.startsWith('image/')) return <Image {...props} />;
  if (mime === 'application/pdf') return <FileText {...props} />;
  if (mime?.includes('word')) return <FileText {...props} />;
  if (mime?.includes('sheet') || mime?.includes('excel')) return <FileSpreadsheet {...props} />;
  if (mime?.includes('presentation') || mime?.includes('powerpoint')) return <Presentation {...props} />;
  if (mime === 'application/zip') return <Archive {...props} />;
  return <Paperclip {...props} />;
}

export default function MessageAttachment({ attachment }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  if (!attachment?.url) return null;

  const isImage = isImageAttachment(attachment);
  const isGif = attachment.mime === 'image/gif'
    || /\.gif$/i.test(attachment.url || attachment.name || '');

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
        <div className="relative inline-block max-w-full">
          <AuthenticatedImage
            storedPath={attachment.url}
            alt={attachment.name || (isGif ? 'GIF' : 'Shared image')}
            className={`max-w-full rounded-md object-contain ${
              isGif ? 'max-h-56 sm:max-h-80' : 'max-h-48 sm:max-h-72'
            }`}
          />
          {isGif && (
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-semibold text-slate-100 tracking-wide">
              GIF
            </span>
          )}
        </div>
        <button
          type="button"
          className="inline-block mt-1 text-xs text-wa-muted hover:text-wa-accent hover:underline disabled:opacity-50"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading…' : isGif ? 'Save GIF' : 'Save image'}
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
        <span className="shrink-0">
          <FileTypeIcon mime={attachment.mime} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate">
            {attachment.name || 'Download file'}
          </span>
          <span className="block text-xs text-wa-muted">
            {downloading ? 'Downloading…' : 'Tap to download'}
          </span>
        </span>
        <span className="text-wa-accent shrink-0">
          {downloading ? (
            <span className="text-sm">…</span>
          ) : (
            <Download size={18} strokeWidth={1.75} aria-hidden />
          )}
        </span>
      </button>
      {error && <p className="mt-1 text-xs text-red-400 px-1">{error}</p>}
    </div>
  );
}
