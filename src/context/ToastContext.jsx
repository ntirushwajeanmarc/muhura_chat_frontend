import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

const TYPE_STYLES = {
  info: 'bg-wa-panel border-wa-border text-slate-100',
  success: 'bg-emerald-900/90 border-emerald-600/50 text-emerald-100',
  error: 'bg-red-900/90 border-red-600/50 text-red-100',
  warning: 'bg-amber-900/90 border-amber-600/50 text-amber-100',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 w-[min(92vw,24rem)] pointer-events-none"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto px-4 py-3 rounded-xl border shadow-lg text-sm leading-snug ${TYPE_STYLES[t.type] || TYPE_STYLES.info}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
