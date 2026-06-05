/** Build a map of userId -> read state from API/socket payload */
export function indexReadStates(reads = []) {
  const map = {};
  reads.forEach((r) => {
    map[r.user_id] = {
      lastReadMessageId: r.last_read_message_id,
      lastReadAt: r.last_read_at,
    };
  });
  return map;
}

/** Whether a reader has seen a message (by created_at comparison). */
export function readerHasSeenMessage(readerState, messageCreatedAt) {
  if (!readerState?.lastReadAt || !messageCreatedAt) return false;
  return new Date(readerState.lastReadAt) >= new Date(messageCreatedAt);
}

/**
 * Receipt status for the sender's own message.
 * direct: peer read → blue; group: all other members read → blue; else amber.
 */
export function getMessageReceiptStatus(message, room, readsByUser, currentUserId) {
  if (!room || room.type === 'public' || !message?.created_at) return null;

  const others = Object.entries(readsByUser || {}).filter(
    ([uid]) => uid !== String(currentUserId)
  );
  if (others.length === 0) return 'delivered';

  const allRead = others.every(([, state]) => readerHasSeenMessage(state, message.created_at));
  return allRead ? 'read' : 'delivered';
}
