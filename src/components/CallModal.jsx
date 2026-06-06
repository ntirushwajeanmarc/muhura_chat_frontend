import React from 'react';
import Avatar from './Avatar';

const STATUS_LABEL = {
  calling: 'Connecting…',
  ringing: 'Ringing…',
  incoming: 'Incoming call',
  active: 'On call',
};

export default function CallModal({
  callState,
  callError,
  onAccept,
  onReject,
  onEnd,
  onDismissError,
  remoteAudioRef,
}) {
  if (!callState && !callError) return null;

  if (!callState && callError) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
        <div className="bg-wa-panel border border-wa-border rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
          <p className="text-red-400 text-sm">{callError}</p>
          <button
            type="button"
            onClick={onDismissError}
            className="mt-4 px-5 py-2.5 rounded-xl bg-wa-surface hover:bg-wa-border text-sm"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  const { status, peer, callType } = callState;
  const isIncoming = status === 'incoming';
  const isActive = status === 'active';
  const isOutgoing = status === 'calling' || status === 'ringing';
  const label = STATUS_LABEL[status] || 'Calling…';

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="bg-wa-panel border border-wa-border rounded-2xl w-full max-w-sm p-8 text-center shadow-2xl">
        <div className={`relative inline-block ${isOutgoing ? 'animate-pulse-ring' : ''}`}>
          <Avatar
            username={peer?.username || '?'}
            color={peer?.avatar_color}
            avatarUrl={peer?.avatar_url}
            size={88}
          />
        </div>
        <p className="mt-5 text-xl font-semibold text-slate-100">{peer?.username}</p>
        <p className="text-sm text-wa-accent mt-2 font-medium">{label}</p>
        {isOutgoing && (
          <p className="text-xs text-wa-muted mt-1">Waiting for them to answer…</p>
        )}
        {callError && <p className="text-xs text-red-400 mt-2">{callError}</p>}

        <div className="flex gap-3 justify-center mt-8">
          {isIncoming && (
            <>
              <button
                type="button"
                onClick={onReject}
                className="px-6 py-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium min-w-[100px]"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="px-6 py-3.5 rounded-full bg-wa-accent hover:bg-wa-accent-hover text-white text-sm font-medium min-w-[100px]"
              >
                Accept
              </button>
            </>
          )}
          {(isOutgoing || isActive) && (
            <button
              type="button"
              onClick={onEnd}
              className="px-8 py-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
            >
              {isActive ? 'End call' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
