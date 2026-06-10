import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import AuthenticatedImage from './AuthenticatedImage';
import ModalCloseBtn from './ModalCloseBtn';

export default function ImageLightbox({ storedPath, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!storedPath) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Photo'}
    >
      <ModalCloseBtn
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/80 hover:text-white inline-flex items-center justify-center"
      />
      <div
        className="max-w-full max-h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthenticatedImage
          storedPath={storedPath}
          alt={alt || 'Photo'}
          allowExpand={false}
          className="max-w-[min(100vw-2rem,520px)] max-h-[min(100dvh-5rem,520px)] w-auto h-auto object-contain rounded-lg shadow-2xl"
          loadingClassName="w-48 h-48 rounded-lg flex items-center justify-center bg-wa-surface/20"
        />
      </div>
    </div>,
    document.body
  );
}
