import { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'studychat_pwa_install_dismissed';
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(isDismissed);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setIos(isIos());
    setInstalled(isStandalone());
    setDismissed(isDismissed());

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const canPrompt =
    !installed &&
    !dismissed &&
    (Boolean(deferredPrompt) || (ios && !isStandalone()));

  return {
    canPrompt,
    install,
    dismiss,
    isIos: ios,
    hasNativePrompt: Boolean(deferredPrompt),
    installed,
  };
}
