import React from 'react';
import { BACKEND_URL } from '../config';

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
  if (!attachment?.url) return null;

  const url = attachment.url.startsWith('http')
    ? attachment.url
    : `${BACKEND_URL}${attachment.url}`;
  const isImage = attachment.mime?.startsWith('image/');

  if (isImage) {
    return (
      <div className="mb-1.5">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={url}
            alt={attachment.name || 'Shared image'}
            loading="lazy"
            className="max-w-full max-h-72 rounded-md cursor-pointer"
          />
        </a>
        <a
          href={url}
          download={attachment.name}
          className="inline-block mt-1 text-xs text-wa-accent hover:underline"
        >
          Download image
        </a>
      </div>
    );
  }

  return (
    <a
      href={url}
      download={attachment.name}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 p-2.5 mb-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors no-underline text-slate-100"
    >
      <span className="text-2xl shrink-0">{fileIcon(attachment.mime)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate">{attachment.name || 'Download file'}</span>
        <span className="block text-xs text-wa-muted">Tap to download</span>
      </span>
      <span className="text-wa-accent text-sm shrink-0">⬇</span>
    </a>
  );
}
