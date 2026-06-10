import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

let socketInstance = null;
let socketToken = null;
let socketRefCount = 0;
let hadSocketConnected = false;
const joinedRooms = new Set();
const reconnectListeners = new Set();

function notifyReconnect() {
  reconnectListeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error('Socket reconnect listener error:', err);
    }
  });
}

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
      socketRef.current = null;
      return undefined;
    }

    const attachSocket = (s) => {
      socketRef.current = s;
      setSocket(s);
      setConnected(s.connected);
      setReconnecting(!s.connected);
    };

    if (socketInstance && socketToken === token) {
      attachSocket(socketInstance);
      socketRefCount += 1;
      return () => {
        socketRefCount -= 1;
        if (socketRefCount <= 0) {
          socketInstance.disconnect();
          socketInstance = null;
          socketToken = null;
          socketRefCount = 0;
          joinedRooms.clear();
        }
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        setReconnecting(false);
      };
    }

    if (socketInstance) {
      socketInstance.disconnect();
      joinedRooms.clear();
    }

    const s = io(SOCKET_URL, {
      auth: { token },
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socketInstance = s;
    socketToken = token;
    socketRefCount = 1;
    attachSocket(s);

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
      joinedRooms.forEach((roomId) => s.emit('join_room', roomId));
      if (hadSocketConnected) {
        notifyReconnect();
      }
      hadSocketConnected = true;
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

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    if (s.connected) onConnect();

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      socketRefCount -= 1;
      if (socketRefCount <= 0) {
        s.disconnect();
        socketInstance = null;
        socketToken = null;
        socketRefCount = 0;
        joinedRooms.clear();
        hadSocketConnected = false;
      }
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setReconnecting(false);
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
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  }, [socket]);

  const onReconnect = useCallback((handler) => {
    reconnectListeners.add(handler);
    return () => reconnectListeners.delete(handler);
  }, []);

  const wake = useCallback(() => {
    const s = socketRef.current;
    if (!s) return;
    if (!s.connected) {
      setReconnecting(true);
      s.connect();
    }
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
    onReconnect,
    wake,
    connected,
    reconnecting,
    socket,
  };
};
