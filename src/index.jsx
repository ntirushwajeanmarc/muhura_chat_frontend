import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { setupPushNotifications } from './utils/pushSubscription';
import { unlockSounds, handleServiceWorkerAlert } from './utils/sounds';
import { setPwaUpdateHandler, notifyPwaUpdateAvailable } from './utils/pwaUpdate';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

// Unlock audio on first tap (required on mobile)
['click', 'touchstart', 'keydown'].forEach((event) => {
  document.addEventListener(event, unlockSounds, { once: true, passive: true });
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'eganira_alert') {
      handleServiceWorkerAlert(event.data);
    }
  });
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    notifyPwaUpdateAvailable();
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setupPushNotifications(registration);
    setPwaUpdateHandler((reload) => updateSW(reload));
    setInterval(() => registration.update(), UPDATE_CHECK_MS);
  },
  onRegisterError(error) {
    console.error('Service worker registration failed:', error);
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
