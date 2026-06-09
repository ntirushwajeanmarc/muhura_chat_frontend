import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlay, Loader2, Link2 } from 'lucide-react';
import { searchGifs } from '../api/gifs';
import IconBtn, { composerBtn } from './IconBtn';

export default function GifPicker({
  onSelect,
  disabled,
  sending = false,
  open: controlledOpen,
  onOpenChange,
  anchorRef: externalAnchorRef,
  showTrigger = true,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchConfigured, setSearchConfigured] = useState(true);
  const [panelStyle, setPanelStyle] = useState({});
  const internalBtnRef = useRef(null);
  const panelRef = useRef(null);
  const searchTimerRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value) => {
    if (isControlled) onOpenChange?.(value);
    else setInternalOpen(value);
  };
  const positionRef = externalAnchorRef || internalBtnRef;

  const updatePosition = useCallback(() => {
    if (!positionRef.current) return;
    const rect = positionRef.current.getBoundingClientRect();
    const panelWidth = Math.min(360, window.innerWidth - 16);
    const panelHeight = Math.min(420, window.innerHeight - 24);
    let left = rect.left;
    let top = rect.top - panelHeight - 8;

    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    if (left < 8) left = 8;
    if (top < 8) top = rect.bottom + 8;

    setPanelStyle({ top, left, width: panelWidth, maxHeight: panelHeight });
  }, [positionRef]);

  const loadGifs = useCallback(async (searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchGifs(searchQuery);
      setGifs(results);
      setSearchConfigured(true);
      if (results.length === 0) {
        setError(searchQuery ? 'No GIFs found' : 'No GIFs available');
      }
    } catch (err) {
      setGifs([]);
      const msg = err.response?.data?.error || 'Could not load GIFs';
      const notConfigured = err.response?.status === 503;
      setSearchConfigured(!notConfigured);
      setError(notConfigured
        ? 'Search not set up — paste a GIF link below (no API key needed).'
        : msg);
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
    if (!open || !searchConfigured) return undefined;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => loadGifs(query.trim()), 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [query, open, loadGifs, searchConfigured]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (panelRef.current?.contains(e.target) || positionRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, setOpen, positionRef]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setPasteUrl('');
    }
  }, [open]);

  const pick = (gif) => {
    if (sending) return;
    onSelect(gif);
    setOpen(false);
    setQuery('');
    setPasteUrl('');
  };

  const sendPaste = (e) => {
    e.preventDefault();
    const url = pasteUrl.trim();
    if (!url || sending) return;
    pick({ id: 'paste', title: 'GIF', gifUrl: url, previewUrl: url });
  };

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!open);
  };

  return (
    <>
      {showTrigger && (
        <IconBtn
          ref={internalBtnRef}
          icon={sending ? Loader2 : ImagePlay}
          className={`${composerBtn} ${sending ? '[&_svg]:animate-spin' : ''}`}
          onClick={toggle}
          disabled={disabled || sending}
          title="Send GIF"
          aria-label="Send GIF"
          aria-expanded={open}
          size={20}
        />
      )}
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[200] flex flex-col bg-wa-panel border border-wa-border rounded-xl shadow-2xl overflow-hidden"
          style={panelStyle}
          role="dialog"
          aria-label="GIF picker"
        >
          {searchConfigured && (
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
          )}
          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            {searchConfigured && loading && (
              <p className="text-center text-sm text-wa-muted py-4 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Loading GIFs…
              </p>
            )}
            {searchConfigured && !loading && error && (
              <p className="text-center text-sm text-wa-muted py-3 px-3 leading-relaxed">{error}</p>
            )}
            {searchConfigured && !loading && !error && gifs.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
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
          <form
            className="shrink-0 p-2 border-t border-wa-border bg-wa-surface/50"
            onSubmit={sendPaste}
          >
            <p className="text-[11px] text-wa-muted mb-1.5 px-0.5 flex items-center gap-1">
              <Link2 size={12} aria-hidden />
              Paste a direct GIF link (no API key needed)
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="https://media.giphy.com/media/…/giphy.gif"
                className="flex-1 min-w-0 px-3 py-2 bg-wa-surface border border-wa-border rounded-lg text-sm outline-none focus:border-wa-accent"
              />
              <button
                type="submit"
                disabled={!pasteUrl.trim() || sending}
                className="px-3 py-2 rounded-lg bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-40 text-white text-sm font-medium shrink-0"
              >
                Send
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
  );
}
