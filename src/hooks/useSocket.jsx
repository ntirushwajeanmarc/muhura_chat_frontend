import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socketUrl = 'https://rwandablogs.blog';

    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    socketInstance = io(socketUrl, {
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
    socketRef.current?.emit('join_room', roomId);
  }, []);

  const sendMessage = useCallback((roomId, content) => {
    socketRef.current?.emit('send_message', { roomId, content });
  }, []);

  const sendTyping = useCallback((roomId, isTyping) => {
    socketRef.current?.emit('typing', { roomId, isTyping });
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { joinRoom, sendMessage, sendTyping, on, socket: socketRef.current };
};
