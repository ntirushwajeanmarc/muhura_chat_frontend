const PREFIX = 'eganira-msgs-';
const MAX_CACHED = 120;

export function cacheRoomMessages(roomId, messages) {
  if (!roomId || !Array.isArray(messages)) return;
  try {
    const slice = messages.slice(-MAX_CACHED);
    localStorage.setItem(`${PREFIX}${roomId}`, JSON.stringify(slice));
  } catch {
    /* storage full */
  }
}

export function getCachedRoomMessages(roomId) {
  if (!roomId) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${roomId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
