const PREFIX = 'eganira_seen_stars_';

export function getSeenStarIds(userId) {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`${PREFIX}${userId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function markStarsSeen(userId, starIds) {
  if (!userId || !starIds?.length) return;
  const seen = getSeenStarIds(userId);
  starIds.forEach((id) => seen.add(id));
  try {
    localStorage.setItem(`${PREFIX}${userId}`, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
}

export function hasUnseenStars(viewerId, stars) {
  if (!stars?.length) return false;
  const seen = getSeenStarIds(viewerId);
  return stars.some((s) => !seen.has(s.id));
}
