import React from 'react';
import Avatar from './Avatar';

export default function CallModal({
  callState,
  onAccept,
  onReject,
  onEnd,
  remoteAudioRef,
}) {
  if (!callState) return null;

  const { status, peer, callType } = callState;
  const isIncoming = status === 'incoming';
  const isActive = status === 'active';
  const isOutgoing = status === 'outgoing';

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="bg-wa-panel border border-wa-border rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
        <Avatar
          username={peer?.username || '?'}
          color={peer?.avatar_color}
          avatarUrl={peer?.avatar_url}
          size={72}
        />
        <p className="mt-4 text-lg font-semibold text-slate-100">{peer?.username}</p>
        <p className="text-sm text-wa-muted mt-1">
          {isIncoming && `Incoming ${callType} call…`}
          {isOutgoing && `Calling…`}
          {isActive && `${callType === 'video' ? 'Video' : 'Voice'} call in progress`}
        </p>

        <div className="flex gap-3 justify-center mt-6">
          {isIncoming && (
            <>
              <button
                type="button"
                onClick={onReject}
                className="px-5 py-3 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="px-5 py-3 rounded-xl bg-wa-accent hover:bg-wa-accent-hover text-white text-sm font-medium"
              >
                Accept
              </button>
            </>
          )}
          {(isOutgoing || isActive) && (
            <button
              type="button"
              onClick={onEnd}
              className="px-6 py-3 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium"
            >
              End call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
