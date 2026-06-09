import { useState, useRef, useCallback, useEffect } from 'react';
import { playCallAlert, stopCallAlert } from '../utils/sounds';
import { getCallSettings, setCallSettings } from '../utils/callSettings';
import { ICE_SERVERS } from '../utils/iceServers';

function createCallId() {
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeSdp(sdp) {
  if (!sdp) return null;
  if (typeof sdp === 'string') return { type: 'offer', sdp };
  if (sdp.type && sdp.sdp) return { type: sdp.type, sdp: sdp.sdp };
  return null;
}

function isMobileCallDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function toIceCandidateInit(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  if (!candidate.candidate) return null;
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid ?? null,
    sdpMLineIndex: candidate.sdpMLineIndex ?? null,
  };
}

export function useCall(socket, currentUser, connected) {
  const [callState, setCallState] = useState(null);
  const [callError, setCallError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(() => getCallSettings().defaultSpeaker);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const activeCallIdRef = useRef(null);
  const pendingIceRef = useRef([]);
  const outputDevicesRef = useRef([]);

  const stopRingtone = useCallback(() => {
    stopCallAlert();
  }, []);

  const playRingtone = useCallback((outgoing = false) => {
    playCallAlert({ outgoing });
  }, []);

  const refreshOutputDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      outputDevicesRef.current = devices.filter((d) => d.kind === 'audiooutput');
      return outputDevicesRef.current;
    } catch {
      return [];
    }
  }, []);

  const playRemoteAudio = useCallback(async () => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.muted = false;
    try {
      await el.play();
    } catch {
      /* autoplay blocked until user gesture — retry on next attach */
    }
  }, []);

  const applySpeakerOutput = useCallback(async (enabled) => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    if (!isMobileCallDevice() || typeof el.setSinkId !== 'function') return;
    try {
      const outputs = outputDevicesRef.current.length
        ? outputDevicesRef.current
        : await refreshOutputDevices();
      if (!outputs.length) return;
      if (enabled) {
        const speaker = outputs.find((d) => /speaker|default/i.test(d.label)) || outputs[0];
        if (speaker?.deviceId) await el.setSinkId(speaker.deviceId);
      } else {
        const earpiece = outputs.find((d) => /earpiece|handset|phone|receiver/i.test(d.label));
        if (earpiece?.deviceId) await el.setSinkId(earpiece.deviceId);
      }
    } catch {
      /* setSinkId not supported or blocked */
    }
  }, [refreshOutputDevices]);

  const bindStreamToVideo = useCallback((el, stream) => {
    if (!el) return;
    el.srcObject = stream || null;
  }, []);

  const attachRemoteStream = useCallback((stream) => {
    if (!stream) return;
    remoteStreamRef.current = stream;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      applySpeakerOutput(speakerOn);
      playRemoteAudio();
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [applySpeakerOutput, speakerOn, playRemoteAudio]);

  const setMicMuted = useCallback((muted) => {
    setIsMuted(muted);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, []);

  const setCameraEnabled = useCallback((enabled) => {
    setIsCameraOff(!enabled);
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMicMuted(!isMuted);
  }, [isMuted, setMicMuted]);

  const toggleCamera = useCallback(() => {
    setCameraEnabled(isCameraOff);
  }, [isCameraOff, setCameraEnabled]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((prev) => {
      const next = !prev;
      setCallSettings({ speakerOn: next, defaultSpeaker: next });
      applySpeakerOutput(next);
      return next;
    });
  }, [applySpeakerOutput]);

  const cleanup = useCallback(() => {
    stopRingtone();
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    activeCallIdRef.current = null;
    pendingIceRef.current = [];
    setIsMuted(false);
    setIsCameraOff(false);
    setCallState(null);
    setCallError(null);
  }, [stopRingtone]);

  const getMedia = useCallback(async (withVideo = false) => {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo
        ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        : false,
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

  const createPeer = useCallback((callId, toUserId, stream, isVideo) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.onicecandidate = (event) => {
      if (event.candidate && socket?.connected) {
        socket.emit('call_ice', { toUserId, callId, candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => {
      let streamOut = remoteStreamRef.current;
      if (event.streams?.[0]) {
        streamOut = event.streams[0];
      } else if (event.track) {
        if (!streamOut) streamOut = new MediaStream();
        if (!streamOut.getTracks().some((t) => t.id === event.track.id)) {
          streamOut.addTrack(event.track);
        }
      }
      if (streamOut) attachRemoteStream(streamOut);
    };
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'failed' || state === 'disconnected') {
        setCallError('Connection lost — check network and try again');
      }
    };
    pcRef.current = pc;
    return pc;
  }, [socket, attachRemoteStream]);

  const startCall = useCallback(async (peerUser, callType = 'audio') => {
    if (!socket?.connected || !connected) {
      setCallError('Not connected — wait a moment and try again');
      return;
    }
    if (!peerUser?.id) return;
    setCallError(null);
    const settings = getCallSettings();
    setSpeakerOn(isMobileCallDevice() ? settings.defaultSpeaker : true);
    const isVideo = callType === 'video';
    try {
      await refreshOutputDevices();
      const stream = await getMedia(isVideo);
      localStreamRef.current = stream;
      bindStreamToVideo(localVideoRef.current, stream);
      const callId = createCallId();
      activeCallIdRef.current = callId;
      const pc = createPeer(callId, peerUser.id, stream, isVideo);
      const offer = await pc.createOffer();
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
      const denied = err.name === 'NotAllowedError';
      setCallError(
        denied
          ? (isVideo ? 'Camera or microphone permission denied' : 'Microphone permission denied')
          : 'Could not start call'
      );
      throw err;
    }
  }, [socket, connected, getMedia, createPeer, cleanup, playRingtone, refreshOutputDevices, bindStreamToVideo]);

  const acceptCall = useCallback(async (invite) => {
    if (!socket?.connected || !invite) return;
    stopRingtone();
    const settings = getCallSettings();
    setSpeakerOn(isMobileCallDevice() ? settings.defaultSpeaker : true);
    const isVideo = invite.callType === 'video';
    try {
      await refreshOutputDevices();
      const stream = await getMedia(isVideo);
      localStreamRef.current = stream;
      bindStreamToVideo(localVideoRef.current, stream);
      activeCallIdRef.current = invite.callId;
      const pc = createPeer(invite.callId, invite.from.id, stream, isVideo);
      const remoteSdp = normalizeSdp(invite.sdp);
      await pc.setRemoteDescription(remoteSdp);
      await flushPendingIce();
      const answer = await pc.createAnswer();
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
      bindStreamToVideo(localVideoRef.current, stream);
      if (remoteStreamRef.current) attachRemoteStream(remoteStreamRef.current);
    } catch (err) {
      socket.emit('call_reject', { toUserId: invite.from.id, callId: invite.callId });
      cleanup();
      setCallError('Could not answer call');
      throw err;
    }
  }, [socket, getMedia, createPeer, cleanup, stopRingtone, flushPendingIce, refreshOutputDevices, bindStreamToVideo, attachRemoteStream]);

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
    if (callState?.status === 'active') {
      applySpeakerOutput(speakerOn);
      if (remoteStreamRef.current) {
        attachRemoteStream(remoteStreamRef.current);
      }
    }
  }, [callState?.status, speakerOn, applySpeakerOutput, attachRemoteStream]);

  useEffect(() => {
    if (callState?.localStream) {
      bindStreamToVideo(localVideoRef.current, callState.localStream);
    }
  }, [callState?.localStream, callState?.status, bindStreamToVideo]);

  useEffect(() => {
    if (callState?.status === 'active' && remoteStreamRef.current) {
      attachRemoteStream(remoteStreamRef.current);
    }
  }, [callState?.status, callState?.callType, attachRemoteStream]);

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
      playRingtone(false);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const kind = invite.callType === 'video' ? 'Video' : 'Voice';
        new Notification(`EganirA — ${kind} call from ${invite.from?.username || 'someone'}`, {
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
      try {
        const remoteSdp = normalizeSdp(sdp);
        await pcRef.current.setRemoteDescription(remoteSdp);
        await flushPendingIce();
        setCallState((prev) => (prev ? { ...prev, status: 'active' } : prev));
        if (remoteStreamRef.current) attachRemoteStream(remoteStreamRef.current);
      } catch {
        setCallError('Could not connect call');
        cleanup();
      }
    };

    const onIce = async ({ callId, candidate }) => {
      if (activeCallIdRef.current !== callId) return;
      const iceInit = toIceCandidateInit(candidate);
      if (!iceInit) return;
      if (!pcRef.current?.remoteDescription) {
        pendingIceRef.current.push(iceInit);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(iceInit);
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
  }, [socket, cleanup, playRingtone, stopRingtone, flushPendingIce, attachRemoteStream]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    callState,
    callError,
    isMuted,
    isCameraOff,
    speakerOn,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    remoteAudioRef,
    remoteVideoRef,
    localVideoRef,
    cleanup,
    clearCallError: () => setCallError(null),
  };
}
