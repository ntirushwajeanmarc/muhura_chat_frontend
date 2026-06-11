const MENTION_TRIGGER_RE = /@(\w*)$/;

export function getMentionTrigger(text, cursorPos) {
  const before = text.slice(0, cursorPos ?? text.length);
  const match = before.match(MENTION_TRIGGER_RE);
  if (!match) return null;
  return {
    query: match[1],
    start: before.length - match[0].length,
  };
}

export function filterMentionCandidates(users, query, selfUsername) {
  const q = (query || '').toLowerCase();
  return (users || [])
    .filter((u) => u.username && u.username !== selfUsername)
    .filter((u) => !q || u.username.toLowerCase().startsWith(q))
    .slice(0, 8);
}

export function isUserMentioned(content, username) {
  if (!content || !username) return false;
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`@${escaped}(?![\\w])`, 'i').test(content);
}

export function insertMention(text, cursorPos, mentionStart, username) {
  const before = text.slice(0, mentionStart);
  const after = text.slice(cursorPos);
  const mention = `@${username} `;
  const next = `${before}${mention}${after}`;
  const newPos = before.length + mention.length;
  return { text: next, cursorPos: newPos };
}
