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
  remoteVideoRef,
  localVideoRef,
  isMuted,
  isCameraOff,
  speakerOn,
  onToggleMute,
  onToggleCamera,
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
  const isVideo = callType === 'video';
  const isIncoming = status === 'incoming';
  const isActive = status === 'active';
  const isOutgoing = status === 'calling' || status === 'ringing';
  const label = STATUS_LABEL[status] || 'Calling…';
  const showControls = isActive || isIncoming;
  const showVideo = isVideo && (isActive || isOutgoing);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {showVideo && (
        <div className="absolute inset-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-black"
          />
          {!isActive && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Avatar
                username={peer?.username || '?'}
                color={peer?.avatar_color}
                avatarUrl={peer?.avatar_url}
                size={96}
              />
            </div>
          )}
          {(isActive || isOutgoing) && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute top-4 right-4 w-28 h-40 sm:w-32 sm:h-44 rounded-xl object-cover border-2 border-white/20 shadow-xl bg-black z-10 ${
                isCameraOff ? 'opacity-0 pointer-events-none' : ''
              }`}
            />
          )}
        </div>
      )}

      <div className={`relative z-10 flex-1 flex flex-col items-center justify-end pb-10 px-4 ${
        showVideo ? 'bg-gradient-to-t from-black/90 via-black/40 to-transparent' : 'bg-gradient-to-b from-wa-dark/95 to-black/95 justify-center'
      }`}>
        {!showVideo && (
          <div className={`text-center ${isOutgoing ? 'animate-pulse-ring' : ''}`}>
            <Avatar
              username={peer?.username || '?'}
              color={peer?.avatar_color}
              avatarUrl={peer?.avatar_url}
              size={96}
            />
          </div>
        )}

        <p className={`text-2xl font-semibold text-slate-50 tracking-tight ${showVideo ? 'mt-auto' : 'mt-6'}`}>
          {peer?.username}
        </p>
        <p className="text-sm text-wa-accent/90 mt-2 font-medium">{label}</p>
        {isOutgoing && (
          <p className="text-xs text-wa-muted mt-1">Waiting for them to answer…</p>
        )}
        {isActive && (
          <p className="text-xs text-wa-muted mt-1">
            {isVideo ? 'Video call' : 'Voice call'}
            {!isVideo && (speakerOn ? ' · Speaker' : ' · Earpiece')}
          </p>
        )}
        {callError && <p className="text-xs text-red-400 mt-2">{callError}</p>}

        {showControls && (
          <div className="flex justify-center gap-5 sm:gap-6 mt-8 flex-wrap">
            {isActive && (
              <>
                <CallControlButton
                  active={isMuted}
                  label={isMuted ? 'Unmute' : 'Mute'}
                  onClick={onToggleMute}
                >
                  {isMuted ? '🔇' : '🎤'}
                </CallControlButton>
                {isVideo && (
                  <CallControlButton
                    active={isCameraOff}
                    label={isCameraOff ? 'Camera on' : 'Camera off'}
                    onClick={onToggleCamera}
                  >
                    {isCameraOff ? '📷' : '📹'}
                  </CallControlButton>
                )}
                {!isVideo && (
                  <CallControlButton
                    active={speakerOn}
                    label={speakerOn ? 'Speaker' : 'Earpiece'}
                    onClick={onToggleSpeaker}
                  >
                    {speakerOn ? '🔊' : '📱'}
                  </CallControlButton>
                )}
              </>
            )}
          </div>
        )}

        <div className={`flex gap-4 justify-center ${showControls && isActive ? 'mt-6' : 'mt-8'}`}>
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
