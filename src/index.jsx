import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import {
  setPwaUpdateHandler,
  notifyPwaUpdateAvailable,
} from './utils/pwaUpdate';
import { setupPushNotifications } from './utils/pushSubscription';

const UPDATE_CHECK_MS = 15 * 60 * 1000;
const MIN_UPDATE_INTERVAL_MS = 60 * 1000;
let lastUpdateCheck = 0;

function checkForSwUpdate(registration) {
  const now = Date.now();
  if (now - lastUpdateCheck < MIN_UPDATE_INTERVAL_MS) return;
  lastUpdateCheck = now;
  registration.update();
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    notifyPwaUpdateAvailable();
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    setupPushNotifications(registration);

    setInterval(() => checkForSwUpdate(registration), UPDATE_CHECK_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForSwUpdate(registration);
      }
    });
  },
  onRegisterError(error) {
    console.error('Service worker registration failed:', error);
  },
});

setPwaUpdateHandler(updateSW);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
