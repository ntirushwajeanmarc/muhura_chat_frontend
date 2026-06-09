export function formatCallDuration(totalSecs) {
  const secs = Math.max(0, parseInt(totalSecs, 10) || 0);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getCallMessageLabel(msg, viewerId) {
  const isVideo = msg.call_type === 'video';
  const kind = isVideo ? 'Video call' : 'Voice call';
  const isOutgoing = msg.user_id === viewerId;

  switch (msg.call_status) {
    case 'completed': {
      const dur = formatCallDuration(msg.call_duration_secs);
      return dur ? `${kind} · ${dur}` : kind;
    }
    case 'missed':
      return isOutgoing
        ? 'No answer'
        : `Missed ${isVideo ? 'video' : 'voice'} call`;
    case 'declined':
      return isOutgoing
        ? `${kind} declined`
        : `Missed ${isVideo ? 'video' : 'voice'} call`;
    default:
      return kind;
  }
}

export function isMissedCallForViewer(msg, viewerId) {
  return msg.message_type === 'call'
    && msg.user_id !== viewerId
    && (msg.call_status === 'missed' || msg.call_status === 'declined');
}

export function callMessagePreview(msg, viewerId) {
  if (msg.message_type !== 'call') return null;
  const label = getCallMessageLabel(msg, viewerId);
  const icon = msg.call_type === 'video' ? '📹' : '📞';
  return `${icon} ${label}`;
}
