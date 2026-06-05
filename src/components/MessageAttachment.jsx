import React from 'react';
import axios from 'axios';
import { secureFileUrl } from '../utils/assetUrl';
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

async function downloadFile(storedPath, filename) {
  const res = await axios.get(secureFileUrl(storedPath), { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  link.click();
  URL.revokeObjectURL(url);
}

export default function MessageAttachment({ attachment }) {
  if (!attachment?.url) return null;

  const isImage = attachment.mime?.startsWith('image/');

  if (isImage) {
    return (
      <div className="mb-1.5">
        <AuthenticatedImage
          storedPath={attachment.url}
          alt={attachment.name || 'Shared image'}
          className="max-w-full max-h-72 rounded-md"
          fallback={
            <button
              type="button"
              className="text-sm text-wa-accent hover:underline"
              onClick={() => downloadFile(attachment.url, attachment.name)}
            >
              Open image
            </button>
          }
        />
        <button
          type="button"
          className="inline-block mt-1 text-xs text-wa-accent hover:underline"
          onClick={() => downloadFile(attachment.url, attachment.name)}
        >
          Download image
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => downloadFile(attachment.url, attachment.name)}
      className="flex items-center gap-2.5 p-2.5 mb-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-slate-100 w-full text-left"
    >
      <span className="text-2xl shrink-0">{fileIcon(attachment.mime)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate">{attachment.name || 'Download file'}</span>
        <span className="block text-xs text-wa-muted">Tap to download</span>
      </span>
      <span className="text-wa-accent text-sm shrink-0">⬇</span>
    </button>
  );
}
