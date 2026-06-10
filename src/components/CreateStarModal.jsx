import React, { useState, useRef } from 'react';
import { Star, X } from 'lucide-react';
import { postStar } from '../api/social';
import CircularProgress from './CircularProgress';
import ModalCloseBtn from './ModalCloseBtn';
import StarTextBackground from './StarTextBackground';
import { DEFAULT_STAR_BACKGROUND, STAR_BACKGROUNDS } from '../utils/starBackgrounds';

export default function CreateStarModal({ onPosted, onClose }) {
  const [content, setContent] = useState('');
  const [backgroundId, setBackgroundId] = useState(DEFAULT_STAR_BACKGROUND);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const isTextOnly = !image;

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) {
      setError('Add text or an image');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const data = await postStar(
        {
          content: content.trim(),
          image,
          backgroundColor: isTextOnly && content.trim() ? backgroundId : undefined,
        },
        setProgress
      );
      onPosted?.(data.star);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post star');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-5" onClick={onClose}>
      <form
        className="bg-wa-panel border border-wa-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h2 className="text-lg font-semibold inline-flex items-center gap-2">
            <Star size={18} strokeWidth={1.75} className="text-amber-400" aria-hidden />
            New star
          </h2>
          <ModalCloseBtn onClick={onClose} />
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-wa-muted">
            Share a star with your followers. Stars disappear after 24 hours.
          </p>

          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-wa-border">
              <img src={preview} alt="" className="w-full max-h-56 object-cover" />
              <button
                type="button"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white inline-flex items-center justify-center"
                onClick={clearImage}
                aria-label="Remove image"
              >
                <X size={16} strokeWidth={1.75} aria-hidden />
              </button>
              <textarea
                className="w-full min-h-[72px] px-4 py-3 bg-black/50 border-t border-white/10 text-sm text-white resize-none outline-none placeholder:text-white/50"
                placeholder="Add a caption…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                disabled={uploading}
              />
            </div>
          ) : (
            <StarTextBackground
              backgroundId={backgroundId}
              className="relative rounded-xl overflow-hidden min-h-[220px] flex items-center justify-center border border-white/10"
            >
              <textarea
                className="w-full min-h-[220px] px-6 py-8 bg-transparent text-center text-lg leading-relaxed font-medium resize-none outline-none placeholder:text-white/60"
                placeholder="Type your star…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                disabled={uploading}
              />
            </StarTextBackground>
          )}

          {isTextOnly && (
            <div>
              <p className="text-[11px] font-semibold text-wa-muted tracking-wide uppercase mb-2">
                Background
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="listbox" aria-label="Star background color">
                {STAR_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    role="option"
                    aria-selected={backgroundId === bg.id}
                    title={bg.id}
                    onClick={() => setBackgroundId(bg.id)}
                    className={`shrink-0 w-9 h-9 rounded-full border-2 transition-transform ${
                      backgroundId === bg.id
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ background: bg.background }}
                  />
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImage}
          />

          {!preview && (
            <button
              type="button"
              className="w-full py-3 border border-dashed border-wa-border rounded-lg text-sm text-wa-muted hover:text-slate-200 hover:border-wa-accent"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              Add photo instead
            </button>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {uploading && (
            <div className="flex justify-center">
              <CircularProgress progress={progress} size={48} />
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || (!content.trim() && !image)}
            className="w-full py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-40 rounded-lg text-white font-semibold text-sm"
          >
            {uploading ? 'Posting…' : 'Post star'}
          </button>
        </div>
      </form>
    </div>
  );
}
