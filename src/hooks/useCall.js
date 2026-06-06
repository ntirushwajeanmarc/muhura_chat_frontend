import { useState, useRef, useCallback, useEffect } from 'react';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

function createCallId() {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useCall(socket, currentUser) {
  const [callState, setCallState] = useState(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const activeCallIdRef = useRef(null);

  const cleanup = useCallback(() => {
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
    setCallState(null);
  }, []);

  const getMedia = useCallback(async (withVideo = false) => {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo,
    });
  }, []);

  const createPeer = useCallback((callId, toUserId, stream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
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
    if (!socket || !peerUser?.id) return;
    try {
      const stream = await getMedia(callType === 'video');
      localStreamRef.current = stream;
      const callId = createCallId();
      activeCallIdRef.current = callId;
      const pc = createPeer(callId, peerUser.id, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_invite', {
        toUserId: peerUser.id,
        callId,
        callType,
        sdp: offer,
      });
      setCallState({
        callId,
        status: 'outgoing',
        callType,
        peer: peerUser,
        localStream: stream,
      });
    } catch (err) {
      cleanup();
      throw err;
    }
  }, [socket, getMedia, createPeer, cleanup]);

  const acceptCall = useCallback(async (invite) => {
    if (!socket || !invite) return;
    try {
      const stream = await getMedia(invite.callType === 'video');
      localStreamRef.current = stream;
      activeCallIdRef.current = invite.callId;
      const pc = createPeer(invite.callId, invite.from.id, stream);
      await pc.setRemoteDescription(invite.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call_answer', {
        toUserId: invite.from.id,
        callId: invite.callId,
        sdp: answer,
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
      throw err;
    }
  }, [socket, getMedia, createPeer, cleanup]);

  const rejectCall = useCallback((invite) => {
    if (!socket || !invite) return;
    socket.emit('call_reject', { toUserId: invite.from.id, callId: invite.callId });
    cleanup();
  }, [socket, cleanup]);

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
      setCallState({
        callId: invite.callId,
        status: 'incoming',
        callType: invite.callType || 'audio',
        peer: invite.from,
        sdp: invite.sdp,
      });
    };

    const onAnswer = async ({ callId, sdp, fromUserId }) => {
      if (activeCallIdRef.current !== callId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(sdp);
      setCallState((prev) => (prev ? { ...prev, status: 'active' } : prev));
    };

    const onIce = async ({ callId, candidate }) => {
      if (activeCallIdRef.current !== callId || !pcRef.current || !candidate) return;
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch {
        /* ignore stale candidates */
      }
    };

    const onReject = ({ callId }) => {
      if (activeCallIdRef.current === callId) cleanup();
    };

    const onEnd = ({ callId }) => {
      if (activeCallIdRef.current === callId) cleanup();
    };

    socket.on('call_invite', onInvite);
    socket.on('call_answer', onAnswer);
    socket.on('call_ice', onIce);
    socket.on('call_reject', onReject);
    socket.on('call_end', onEnd);

    return () => {
      socket.off('call_invite', onInvite);
      socket.off('call_answer', onAnswer);
      socket.off('call_ice', onIce);
      socket.off('call_reject', onReject);
      socket.off('call_end', onEnd);
    };
  }, [socket, cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    remoteAudioRef,
    cleanup,
  };
}
