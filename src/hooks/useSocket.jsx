import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

let socketInstance = null;
const joinedRooms = new Set();

export const useSocket = (token) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      setReconnecting(false);
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
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    socketInstance = socket;
    socketRef.current = socket;
    setSocket(socket);

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
      joinedRooms.forEach((roomId) => socket.emit('join_room', roomId));
    };

    const onDisconnect = (reason) => {
      setConnected(false);
      if (reason !== 'io client disconnect') {
        setReconnecting(true);
      }
    };

    const onConnectError = () => {
      setConnected(false);
      setReconnecting(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
      socketInstance = null;
      socketRef.current = null;
      setConnected(false);
      setReconnecting(false);
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

  const syncPresence = useCallback(() => {
    socketRef.current?.emit('presence_sync');
  }, []);

  const sendMessage = useCallback((roomId, content, replyToId = null, starReplyId = null) => {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('send_message', { roomId, content, replyToId, starReplyId });
    return true;
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
    syncPresence,
    sendMessage,
    editMessage,
    markRead,
    sendTyping,
    on,
    connected,
    reconnecting,
    socket,
  };
};
