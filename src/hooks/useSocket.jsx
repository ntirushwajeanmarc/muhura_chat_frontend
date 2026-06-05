import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

let socketInstance = null;

export const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    socketInstance = io(SOCKET_URL, {
      auth: { token },
      path: '/socket.io',
    });

    socketRef.current = socketInstance;

    return () => {
      socketInstance?.disconnect();
      socketInstance = null;
      socketRef.current = null;
    };
  }, [token]);

  const joinRoom = useCallback((roomId) => {
    if (roomId) socketRef.current?.emit('join_room', roomId);
  }, []);

  const joinRooms = useCallback((roomIds) => {
    roomIds.filter(Boolean).forEach((id) => socketRef.current?.emit('join_room', id));
  }, []);

  const setPresenceRoom = useCallback((roomId) => {
    if (roomId) socketRef.current?.emit('presence_room', roomId);
  }, []);

  const sendMessage = useCallback((roomId, content, replyToId = null) => {
    socketRef.current?.emit('send_message', { roomId, content, replyToId });
  }, []);

  const sendTyping = useCallback((roomId, isTyping) => {
    socketRef.current?.emit('typing', { roomId, isTyping });
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { joinRoom, joinRooms, setPresenceRoom, sendMessage, sendTyping, on, socket: socketRef.current };
};
