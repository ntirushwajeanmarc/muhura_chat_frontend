const UPDATE_EVENT = 'eganira-pwa-update-available';

let applyUpdateFn = null;

export function setPwaUpdateHandler(fn) {
  applyUpdateFn = fn;
}

export function notifyPwaUpdateAvailable() {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function subscribePwaUpdate(callback) {
  window.addEventListener(UPDATE_EVENT, callback);
  return () => window.removeEventListener(UPDATE_EVENT, callback);
}

export function applyPwaUpdate() {
  if (applyUpdateFn) {
    applyUpdateFn(true);
    return true;
  }
  window.location.reload();
  return true;
}

export function checkForPwaUpdate() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration().then((reg) => {
    reg?.update();
  });
}
