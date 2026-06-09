import React from 'react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import {
  getCallMessageLabel,
  isMissedCallForViewer,
} from '../utils/callMessages';

export default function CallMessageBubble({ message, viewerId, formatTime }) {
  const isVideo = message.call_type === 'video';
  const isOutgoing = message.user_id === viewerId;
  const missed = isMissedCallForViewer(message, viewerId);
  const label = getCallMessageLabel(message, viewerId);

  const CallIcon = isVideo ? Video : Phone;
  const DirectionIcon = isOutgoing ? PhoneOutgoing : PhoneIncoming;

  return (
    <div className="flex justify-center py-2">
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm border shadow-sm max-w-[min(92%,360px)] ${
          missed
            ? 'bg-red-950/40 border-red-500/30 text-red-300'
            : 'bg-wa-panel/90 border-wa-border/80 text-wa-muted'
        }`}
        aria-label={label}
      >
        <CallIcon size={16} strokeWidth={1.75} className={missed ? 'text-red-400' : 'text-wa-accent'} aria-hidden />
        <span className={`font-medium ${missed ? 'text-red-300' : 'text-slate-200'}`}>
          {label}
        </span>
        <DirectionIcon size={12} className="text-wa-muted/80" aria-hidden />
        <span className="text-[10px] text-wa-muted/90 ml-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
