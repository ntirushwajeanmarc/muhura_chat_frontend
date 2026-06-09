import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlay, Loader2 } from 'lucide-react';
import { searchGifs } from '../api/gifs';
import IconBtn, { composerBtn } from './IconBtn';

export default function GifPicker({ onSelect, disabled, sending = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [panelStyle, setPanelStyle] = useState({});
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const searchTimerRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const panelWidth = Math.min(360, window.innerWidth - 16);
    const panelHeight = 380;
    let left = rect.left;
    let top = rect.top - panelHeight - 8;

    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    if (left < 8) left = 8;
    if (top < 8) top = rect.bottom + 8;

    setPanelStyle({ top, left, width: panelWidth, maxHeight: panelHeight });
  }, []);

  const loadGifs = useCallback(async (searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchGifs(searchQuery);
      setGifs(results);
      if (results.length === 0) {
        setError(searchQuery ? 'No GIFs found' : 'No GIFs available');
      }
    } catch (err) {
      setGifs([]);
      setError(err.response?.data?.error || 'Could not load GIFs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    loadGifs('');
    const onResize = () => updatePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updatePosition, loadGifs]);

  useEffect(() => {
    if (!open) return undefined;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => loadGifs(query.trim()), 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [query, open, loadGifs]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (gif) => {
    if (sending) return;
    onSelect(gif);
    setOpen(false);
    setQuery('');
  };

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((o) => !o);
  };

  return (
    <>
      <IconBtn
        ref={btnRef}
        icon={sending ? Loader2 : ImagePlay}
        className={`${composerBtn} ${sending ? '[&_svg]:animate-spin' : ''}`}
        onClick={toggle}
        disabled={disabled || sending}
        title="Send GIF"
        aria-label="Send GIF"
        aria-expanded={open}
        size={20}
      />
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[200] flex flex-col bg-wa-panel border border-wa-border rounded-xl shadow-2xl overflow-hidden"
          style={panelStyle}
          role="dialog"
          aria-label="GIF picker"
        >
          <div className="p-2 border-b border-wa-border shrink-0">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs…"
              className="w-full px-3 py-2 bg-wa-surface border border-wa-border rounded-lg text-sm outline-none focus:border-wa-accent"
              autoFocus
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            {loading && (
              <p className="text-center text-sm text-wa-muted py-6 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Loading GIFs…
              </p>
            )}
            {!loading && error && (
              <p className="text-center text-sm text-wa-muted py-6 px-3 leading-relaxed">{error}</p>
            )}
            {!loading && !error && gifs.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    className="relative aspect-square rounded-lg overflow-hidden bg-wa-surface hover:ring-2 hover:ring-wa-accent transition-all"
                    onClick={() => pick(gif)}
                    title={gif.title}
                    disabled={sending}
                  >
                    <img
                      src={gif.previewUrl}
                      alt={gif.title || 'GIF'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
