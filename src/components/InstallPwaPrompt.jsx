import React, { useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function InstallPwaPrompt() {
  const isMobile = useIsMobile();
  const { canPrompt, install, dismiss, isIos, hasNativePrompt } = usePwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (!isMobile || !canPrompt) return null;

  const handleInstall = async () => {
    if (hasNativePrompt) {
      await install();
      return;
    }
    setShowIosHelp(true);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-safe animate-slide-up"
      role="region"
      aria-label="Install app"
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-wa-border bg-wa-panel shadow-2xl overflow-hidden">
        {showIosHelp && isIos ? (
          <div className="p-4">
            <div className="flex items-start gap-3">
              <img src="/logo.png" alt="" className="w-12 h-12 rounded-xl shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-100">Add EganirA to Home Screen</p>
                <ol className="mt-2 text-sm text-wa-muted space-y-1.5 list-decimal list-inside">
                  <li>Tap the Share button in Safari</li>
                  <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</li>
                  <li>Tap &ldquo;Add&rdquo; to install</li>
                </ol>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-wa-muted hover:text-slate-200 bg-wa-surface"
              >
                Back
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-200 bg-wa-accent hover:bg-wa-accent-hover"
              >
                Got it
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="w-12 h-12 rounded-xl shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-100 text-sm">Install EganirA</p>
                <p className="text-xs text-wa-muted mt-0.5">
                  Add to your home screen for faster access and full-screen chat.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="w-8 h-8 rounded-lg text-wa-muted hover:text-slate-200 hover:bg-wa-surface shrink-0"
                aria-label="Dismiss install prompt"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl text-sm text-wa-muted hover:text-slate-200 bg-wa-surface"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-wa-accent hover:bg-wa-accent-hover"
              >
                Install
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
