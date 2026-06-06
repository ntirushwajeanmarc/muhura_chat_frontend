import React, { useState, useEffect } from 'react';
import { subscribePwaUpdate, applyPwaUpdate } from '../utils/pwaUpdate';

export default function PwaUpdatePrompt() {
  const [available, setAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => subscribePwaUpdate(() => setAvailable(true)), []);

  if (!available) return null;

  const handleUpdate = () => {
    setUpdating(true);
    applyPwaUpdate();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div
        className="bg-wa-panel border border-wa-border rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center"
        role="alertdialog"
        aria-labelledby="pwa-update-title"
        aria-describedby="pwa-update-desc"
      >
        <div className="text-3xl mb-3">🔄</div>
        <h2 id="pwa-update-title" className="text-lg font-semibold text-slate-100">
          Update available
        </h2>
        <p id="pwa-update-desc" className="text-sm text-wa-muted mt-2 leading-relaxed">
          A new version of EganirA is ready. Update now to get the latest features and fixes.
        </p>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="mt-5 w-full py-3 rounded-xl bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-60 text-white font-semibold text-sm transition-colors"
        >
          {updating ? 'Updating…' : 'Update now'}
        </button>
      </div>
    </div>
  );
}
