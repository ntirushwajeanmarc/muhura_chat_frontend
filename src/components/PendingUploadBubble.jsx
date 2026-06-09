import React from 'react';
import { Image, FileText, Paperclip } from 'lucide-react';
import CircularProgress from './CircularProgress';

function FileTypeIcon({ name }) {
  const ext = name?.split('.').pop()?.toLowerCase();
  const props = { size: 28, strokeWidth: 1.5, className: 'text-wa-muted', 'aria-hidden': true };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <Image {...props} />;
  if (ext === 'pdf') return <FileText {...props} />;
  return <Paperclip {...props} />;
}

export default function PendingUploadBubble({ file, progress, previewUrl, caption }) {
  const isImage = file?.type?.startsWith('image/');

  return (
    <div className="flex justify-end mt-3">
      <div className="relative w-fit max-w-[min(88%,400px)] bg-wa-bubble rounded-2xl rounded-br-md shadow-sm overflow-hidden">
        {isImage && previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Uploading"
              className="max-w-full max-h-56 block opacity-70"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <CircularProgress progress={progress} size={56} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 min-w-[180px]">
            <span className="shrink-0">
              <FileTypeIcon name={file?.name} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file?.name}</p>
              <p className="text-xs text-wa-muted">Uploading…</p>
            </div>
            <CircularProgress progress={progress} size={44} strokeWidth={3} />
          </div>
        )}
        {caption && (
          <p className="px-3.5 py-2 text-sm border-t border-white/10">{caption}</p>
        )}
      </div>
    </div>
  );
}
