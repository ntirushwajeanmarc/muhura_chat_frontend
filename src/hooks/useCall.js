import { useState, useRef, useCallback, useEffect } from 'react';
import { playCallAlert, stopCallAlert } from '../utils/sounds';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

function createCallId() {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeSdp(sdp) {
  if (!sdp) return null;
  if (typeof sdp === 'string') return { type: 'offer', sdp };
  return { type: sdp.type, sdp: sdp.sdp };
}

export function useCall(socket, currentUser, connected) {
  const [callState, setCallState] = useState(null);
  const [callError, setCallError] = useState(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const activeCallIdRef = useRef(null);
  const pendingIceRef = useRef([]);
  const stopRingtone = useCallback(() => {
    stopCallAlert();
  }, []);

  const playRingtone = useCallback(() => {
    playCallAlert();
  }, []);

  const cleanup = useCallback(() => {
    stopRingtone();
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    activeCallIdRef.current = null;
    pendingIceRef.current = [];
    setCallState(null);
    setCallError(null);
  }, [stopRingtone]);

  const getMedia = useCallback(async (withVideo = false) => {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo,
    });
  }, []);

  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const createPeer = useCallback((callId, toUserId, stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.onicecandidate = (event) => {
      if (event.candidate && socket?.connected) {
        socket.emit('call_ice', { toUserId, callId, candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };
    pcRef.current = pc;
    return pc;
  }, [socket]);

  const startCall = useCallback(async (peerUser, callType = 'audio') => {
    if (!socket?.connected || !connected) {
      setCallError('Not connected — wait a moment and try again');
      return;
    }
    if (!peerUser?.id) return;
    setCallError(null);
    try {
      const stream = await getMedia(callType === 'video');
      localStreamRef.current = stream;
      const callId = createCallId();
      activeCallIdRef.current = callId;
      const pc = createPeer(callId, peerUser.id, stream);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
      await pc.setLocalDescription(offer);
      socket.emit('call_invite', {
        toUserId: peerUser.id,
        callId,
        callType,
        sdp: pc.localDescription,
      });
      setCallState({
        callId,
        status: 'calling',
        callType,
        peer: peerUser,
        localStream: stream,
      });
      playRingtone(true);
    } catch (err) {
      cleanup();
      setCallError(err.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Could not start call');
      throw err;
    }
  }, [socket, connected, getMedia, createPeer, cleanup, playRingtone]);

  const acceptCall = useCallback(async (invite) => {
    if (!socket?.connected || !invite) return;
    stopRingtone();
    try {
      const stream = await getMedia(invite.callType === 'video');
      localStreamRef.current = stream;
      activeCallIdRef.current = invite.callId;
      const pc = createPeer(invite.callId, invite.from.id, stream);
      const remoteSdp = normalizeSdp(invite.sdp);
      await pc.setRemoteDescription(remoteSdp);
      await flushPendingIce();
      const answer = await pc.createAnswer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(answer);
      socket.emit('call_answer', {
        toUserId: invite.from.id,
        callId: invite.callId,
        sdp: pc.localDescription,
      });
      setCallState({
        callId: invite.callId,
        status: 'active',
        callType: invite.callType,
        peer: invite.from,
        localStream: stream,
      });
    } catch (err) {
      socket.emit('call_reject', { toUserId: invite.from.id, callId: invite.callId });
      cleanup();
      setCallError('Could not answer call');
      throw err;
    }
  }, [socket, getMedia, createPeer, cleanup, stopRingtone, flushPendingIce]);

  const rejectCall = useCallback((invite) => {
    if (!socket || !invite) return;
    stopRingtone();
    socket.emit('call_reject', { toUserId: invite.from.id, callId: invite.callId });
    cleanup();
  }, [socket, cleanup, stopRingtone]);

  const endCall = useCallback(() => {
    if (!socket || !callState) return;
    const peerId = callState.peer?.id;
    if (peerId && activeCallIdRef.current) {
      socket.emit('call_end', { toUserId: peerId, callId: activeCallIdRef.current });
    }
    cleanup();
  }, [socket, callState, cleanup]);

  useEffect(() => {
    if (!socket) return undefined;

    const onInvite = (invite) => {
      if (activeCallIdRef.current) {
        socket.emit('call_reject', { toUserId: invite.from.id, callId: invite.callId });
        return;
      }
      socket.emit('call_ringing', { toUserId: invite.from.id, callId: invite.callId });
      setCallState({
        callId: invite.callId,
        status: 'incoming',
        callType: invite.callType || 'audio',
        peer: invite.from,
        sdp: invite.sdp,
      });
      playRingtone();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`Incoming call from ${invite.from?.username || 'someone'}`, {
          icon: '/logo.png',
          tag: `call-${invite.callId}`,
          silent: false,
          requireInteraction: true,
        });
      }
    };

    const onDelivered = ({ callId }) => {
      if (activeCallIdRef.current !== callId) return;
      setCallState((prev) => (prev ? { ...prev, status: 'ringing' } : prev));
    };

    const onRinging = ({ callId }) => {
      if (activeCallIdRef.current !== callId) return;
      setCallState((prev) => (prev ? { ...prev, status: 'ringing' } : prev));
    };

    const onAnswer = async ({ callId, sdp }) => {
      if (activeCallIdRef.current !== callId || !pcRef.current) return;
      stopRingtone();
      const remoteSdp = normalizeSdp(sdp);
      await pcRef.current.setRemoteDescription(remoteSdp);
      await flushPendingIce();
      setCallState((prev) => (prev ? { ...prev, status: 'active' } : prev));
    };

    const onIce = async ({ callId, candidate }) => {
      if (activeCallIdRef.current !== callId || !candidate) return;
      if (!pcRef.current?.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch {
        /* ignore */
      }
    };

    const onReject = ({ callId }) => {
      if (activeCallIdRef.current === callId) {
        setCallError('Call declined');
        cleanup();
      }
    };

    const onEnd = ({ callId }) => {
      if (activeCallIdRef.current === callId) cleanup();
    };

    socket.on('call_invite', onInvite);
    socket.on('call_delivered', onDelivered);
    socket.on('call_ringing', onRinging);
    socket.on('call_answer', onAnswer);
    socket.on('call_ice', onIce);
    socket.on('call_reject', onReject);
    socket.on('call_end', onEnd);

    return () => {
      socket.off('call_invite', onInvite);
      socket.off('call_delivered', onDelivered);
      socket.off('call_ringing', onRinging);
      socket.off('call_answer', onAnswer);
      socket.off('call_ice', onIce);
      socket.off('call_reject', onReject);
      socket.off('call_end', onEnd);
    };
  }, [socket, cleanup, playRingtone, stopRingtone, flushPendingIce]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    callState,
    callError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    remoteAudioRef,
    cleanup,
    clearCallError: () => setCallError(null),
  };
}
