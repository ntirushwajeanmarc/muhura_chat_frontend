const PREFS_KEY = 'studychat_notifications';

export function getNotificationPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{"enabled":true,"sound":true}');
  } catch {
    return { enabled: true, sound: true };
  }
}

export function setNotificationPrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...getNotificationPrefs(), ...prefs }));
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') {
    const { ensurePushSubscription } = await import('./pushSubscription');
    ensurePushSubscription();
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    const { ensurePushSubscription } = await import('./pushSubscription');
    ensurePushSubscription();
  }
  return result;
}

export function canNotify() {
  const prefs = getNotificationPrefs();
  return prefs.enabled && 'Notification' in window && Notification.permission === 'granted';
}

export function playNotificationSound() {
  const prefs = getNotificationPrefs();
  if (!prefs.sound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* ignore */
  }
}

export function showMessageNotification({ title, body, roomId, onClick }) {
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return;

  if (canNotify()) {
    const notification = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: `room-${roomId}`,
    });
    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
  }

  if (prefs.sound) {
    playNotificationSound();
  }
}

export function messagePreview(msg) {
  if (msg.attachment) {
    const isImg = msg.attachment.mime?.startsWith('image/')
      || /\.(jpe?g|png|gif|webp)$/i.test(msg.attachment.url || msg.attachment.name || '');
    if (isImg) return '📷 Photo';
    return `📎 ${msg.attachment.name || 'File'}`;
  }
  const text = (msg.content || '').trim();
  if (!text) return 'New message';
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}
