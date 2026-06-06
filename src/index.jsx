import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import {
  setPwaUpdateHandler,
  notifyPwaUpdateAvailable,
  checkForPwaUpdate,
} from './utils/pwaUpdate';

const UPDATE_CHECK_MS = 15 * 60 * 1000;

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    notifyPwaUpdateAvailable();
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    setInterval(() => registration.update(), UPDATE_CHECK_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update();
      }
    });

    window.addEventListener('focus', () => registration.update());
  },
  onRegisterError(error) {
    console.error('Service worker registration failed:', error);
  },
});

setPwaUpdateHandler(updateSW);

checkForPwaUpdate();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
