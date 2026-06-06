import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

let socketInstance = null;
const joinedRooms = new Set();

export const useSocket = (token) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      setSocket(null);
      return undefined;
    }

    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      path: '/socket.io',
    });

    socketInstance = socket;
    socketRef.current = socket;
    setSocket(socket);

    const onConnect = () => {
      setConnected(true);
      joinedRooms.forEach((roomId) => socket.emit('join_room', roomId));
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      socketInstance = null;
      socketRef.current = null;
      setConnected(false);
      setSocket(null);
    };
  }, [token]);

  const joinRoom = useCallback((roomId) => {
    if (!roomId) return;
    joinedRooms.add(roomId);
    socketRef.current?.emit('join_room', roomId);
  }, []);

  const joinRooms = useCallback((roomIds) => {
    roomIds.filter(Boolean).forEach((id) => {
      joinedRooms.add(id);
      socketRef.current?.emit('join_room', id);
    });
  }, []);

  const setPresenceRoom = useCallback((roomId) => {
    if (roomId) socketRef.current?.emit('presence_room', roomId);
  }, []);

  const sendMessage = useCallback((roomId, content, replyToId = null) => {
    socketRef.current?.emit('send_message', { roomId, content, replyToId });
  }, []);

  const editMessage = useCallback((roomId, messageId, content) => {
    socketRef.current?.emit('edit_message', { roomId, messageId, content });
  }, []);

  const markRead = useCallback((roomId, messageId) => {
    if (roomId && messageId) {
      socketRef.current?.emit('mark_read', { roomId, messageId });
    }
  }, []);

  const sendTyping = useCallback((roomId, isTyping) => {
    socketRef.current?.emit('typing', { roomId, isTyping });
  }, []);

  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  return {
    joinRoom,
    joinRooms,
    setPresenceRoom,
    sendMessage,
    editMessage,
    markRead,
    sendTyping,
    on,
    connected,
    socket,
  };
};
