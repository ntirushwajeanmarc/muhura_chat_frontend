import React from 'react';
import Avatar from './Avatar';

const STATUS_LABEL = {
  calling: 'Connecting…',
  ringing: 'Ringing…',
  incoming: 'Incoming call',
  active: 'On call',
};

function CallControlButton({ active, label, onClick, children, variant = 'default' }) {
  const base = 'flex flex-col items-center gap-1.5 min-w-[72px]';
  const btnClass = variant === 'danger'
    ? 'w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xl shadow-lg transition-colors'
    : active
      ? 'w-14 h-14 rounded-full bg-wa-accent text-white flex items-center justify-center text-xl shadow-lg transition-colors'
      : 'w-14 h-14 rounded-full bg-wa-surface hover:bg-wa-border text-slate-200 flex items-center justify-center text-xl border border-wa-border transition-colors';

  return (
    <div className={base}>
      <button type="button" className={btnClass} onClick={onClick} aria-label={label}>
        {children}
      </button>
      <span className="text-[11px] text-wa-muted">{label}</span>
    </div>
  );
}

export default function CallModal({
  callState,
  callError,
  onAccept,
  onReject,
  onEnd,
  onDismissError,
  remoteAudioRef,
  isMuted,
  speakerOn,
  onToggleMute,
  onToggleSpeaker,
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
  const showControls = isActive || isIncoming;

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-b from-wa-dark/95 to-black/95 flex items-center justify-center p-4">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="w-full max-w-sm text-center">
        <div className={`relative inline-block ${isOutgoing ? 'animate-pulse-ring' : ''}`}>
          <Avatar
            username={peer?.username || '?'}
            color={peer?.avatar_color}
            avatarUrl={peer?.avatar_url}
            size={96}
          />
        </div>
        <p className="mt-6 text-2xl font-semibold text-slate-50 tracking-tight">{peer?.username}</p>
        <p className="text-sm text-wa-accent/90 mt-2 font-medium">{label}</p>
        {isOutgoing && (
          <p className="text-xs text-wa-muted mt-1">Waiting for them to answer…</p>
        )}
        {isActive && (
          <p className="text-xs text-wa-muted mt-1">
            {callType === 'video' ? 'Video call' : 'Voice call'}
            {speakerOn ? ' · Speaker' : ' · Earpiece'}
          </p>
        )}
        {callError && <p className="text-xs text-red-400 mt-2">{callError}</p>}

        {showControls && (
          <div className="flex justify-center gap-6 mt-10">
            {isActive && (
              <>
                <CallControlButton
                  active={isMuted}
                  label={isMuted ? 'Unmute' : 'Mute'}
                  onClick={onToggleMute}
                >
                  {isMuted ? '🔇' : '🎤'}
                </CallControlButton>
                <CallControlButton
                  active={speakerOn}
                  label={speakerOn ? 'Speaker' : 'Earpiece'}
                  onClick={onToggleSpeaker}
                >
                  {speakerOn ? '🔊' : '📱'}
                </CallControlButton>
              </>
            )}
          </div>
        )}

        <div className={`flex gap-4 justify-center ${showControls && isActive ? 'mt-8' : 'mt-10'}`}>
          {isIncoming && (
            <>
              <CallControlButton label="Decline" onClick={onReject} variant="danger">
                ✕
              </CallControlButton>
              <CallControlButton label="Accept" onClick={onAccept} active>
                ✓
              </CallControlButton>
            </>
          )}
          {(isOutgoing || isActive) && (
            <CallControlButton label={isActive ? 'End' : 'Cancel'} onClick={onEnd} variant="danger">
              📞
            </CallControlButton>
          )}
        </div>
      </div>
    </div>
  );
}
