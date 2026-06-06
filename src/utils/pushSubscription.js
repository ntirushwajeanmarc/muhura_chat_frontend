import axios from 'axios';
import { BACKEND_URL } from '../config';
import { getNotificationPrefs } from './notifications';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(registration) {
  if (!registration?.pushManager) return null;
  if (!localStorage.getItem('token')) return null;

  try {
    const { data } = await axios.get(`${BACKEND_URL}/api/push/vapid-public-key`);
    if (!data.publicKey) return null;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    const json = subscription.toJSON();
    await axios.post(`${BACKEND_URL}/api/push/subscribe`, {
      endpoint: json.endpoint,
      keys: json.keys,
    });
    return subscription;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return null;
  }
}

export async function unsubscribeFromPush(registration) {
  if (!registration?.pushManager) return;
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await axios.delete(`${BACKEND_URL}/api/push/subscribe`, { data: { endpoint } });
    await subscription.unsubscribe();
  } catch {
    /* ignore */
  }
}

export async function setupPushNotifications(registration) {
  if (!registration) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return;
  await subscribeToPush(registration);
}

export async function ensurePushSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;
  const registration = await navigator.serviceWorker.ready;
  return subscribeToPush(registration);
}
