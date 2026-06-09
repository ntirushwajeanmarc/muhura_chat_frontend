const PREFS_KEY = 'studychat_notifications';

export function getNotificationPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{"enabled":true,"sound":false}');
  } catch {
    return { enabled: true, sound: false };
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

export function showMessageNotification({ title, body, roomId, onClick }) {
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return;

  if (canNotify()) {
    const notification = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: `room-${roomId}`,
      silent: true,
    });
    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
  }
}

export function messagePreview(msg, viewerId = null) {
  if (msg.message_type === 'call') {
    const isVideo = msg.call_type === 'video';
    const kind = isVideo ? 'Video call' : 'Voice call';
    if (msg.call_status === 'completed') return `📞 ${kind}`;
    if (msg.call_status === 'missed') {
      const outgoing = viewerId && msg.user_id === viewerId;
      return outgoing ? `📞 No answer` : `📞 Missed ${isVideo ? 'video' : 'voice'} call`;
    }
    if (msg.call_status === 'declined') return `📞 ${kind} declined`;
    return `📞 ${kind}`;
  }
  if (msg.attachment) {
    const isGif = msg.attachment.mime === 'image/gif'
      || /\.gif$/i.test(msg.attachment.url || msg.attachment.name || '');
    if (isGif) return 'GIF';
    const isImg = msg.attachment.mime?.startsWith('image/')
      || /\.(jpe?g|png|gif|webp)$/i.test(msg.attachment.url || msg.attachment.name || '');
    if (isImg) return '📷 Photo';
    return `📎 ${msg.attachment.name || 'File'}`;
  }
  const text = (msg.content || '').trim();
  if (!text) return 'New message';
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}
