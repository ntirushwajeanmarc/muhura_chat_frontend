import React from 'react';
import { Phone, Video, PhoneMissed } from 'lucide-react';
import {
  getCallMessageLabel,
  isMissedCallForViewer,
} from '../utils/callMessages';

export default function CallMessageBubble({ message, viewerId, formatTime }) {
  const isVideo = message.call_type === 'video';
  const isOutgoing = message.user_id === viewerId;
  const missed = isMissedCallForViewer(message, viewerId);
  const label = getCallMessageLabel(message, viewerId);

  const Icon = missed ? PhoneMissed : (isVideo ? Video : Phone);

  const alignClass = missed
    ? 'justify-start pl-2 sm:pl-3'
    : isOutgoing
      ? 'justify-end pr-2 sm:pr-3'
      : 'justify-start pl-2 sm:pl-3';

  return (
    <div className={`flex w-full py-2 ${alignClass}`}>
      <div
        className={`inline-flex items-center gap-3 px-3 py-2.5 rounded-xl max-w-[min(94%,400px)] ${
          missed
            ? 'bg-red-500/20 border border-red-400/50 shadow-sm'
            : 'bg-wa-panel/95 border border-wa-border shadow-sm'
        }`}
        role="status"
        aria-label={label}
      >
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
            missed
              ? 'bg-red-500/30 text-red-400'
              : 'bg-wa-accent/20 text-wa-accent'
          }`}
        >
          <Icon size={20} strokeWidth={2} aria-hidden />
        </span>
        <span className={`text-sm font-semibold leading-tight ${missed ? 'text-red-200' : 'text-slate-100'}`}>
          {label}
        </span>
        <span className="text-[11px] text-wa-muted shrink-0 tabular-nums">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
