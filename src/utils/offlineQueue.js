const QUEUE_KEY = 'eganira-offline-queue';

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function enqueueMessage({ roomId, content, replyToId = null }) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    roomId,
    content,
    replyToId,
    createdAt: new Date().toISOString(),
  };
  writeQueue([...readQueue(), item]);
  return item;
}

export function getQueuedMessages() {
  return readQueue();
}

export function removeQueuedMessage(id) {
  writeQueue(readQueue().filter((m) => m.id !== id));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}
