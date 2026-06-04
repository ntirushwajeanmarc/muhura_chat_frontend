import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { BACKEND_URL } from '../config';

const Avatar = ({ username, color, size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: color || '#6366f1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: size * 0.4,
    flexShrink: 0,
  }}>
    {username?.[0]?.toUpperCase()}
  </div>
);

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const { joinRoom, sendMessage, sendTyping, on } = useSocket(token);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch rooms
  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/rooms`).then(res => {
      setRooms(res.data);
      if (res.data.length > 0) setActiveRoom(res.data[0]);
    });
  }, []);

  // Join room & fetch messages when room changes
  useEffect(() => {
    if (!activeRoom) return;
    joinRoom(activeRoom.id);
    axios.get(`${BACKEND_URL}/api/rooms/${activeRoom.id}/messages`).then(res => setMessages(res.data));
    setTypingUsers([]);
  }, [activeRoom, joinRoom]);

  // Socket events
  useEffect(() => {
    const offMsg = on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    const offOnline = on('online_users', (users) => setOnlineUsers(users));
    const offTyping = on('user_typing', ({ username, isTyping }) => {
      setTypingUsers(prev =>
        isTyping ? [...new Set([...prev, username])] : prev.filter(u => u !== username)
      );
    });
    return () => { offMsg?.(); offOnline?.(); offTyping?.(); };
  }, [on]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeRoom) return;
    sendMessage(activeRoom.id, input.trim());
    setInput('');
    sendTyping(activeRoom.id, false);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    sendTyping(activeRoom?.id, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(activeRoom?.id, false), 1500);
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const groupMessages = (msgs) => {
    const grouped = [];
    msgs.forEach((msg, i) => {
      const prev = msgs[i - 1];
      const sameUser = prev?.username === msg.username;
      const sameMinute = prev && Math.abs(new Date(msg.created_at) - new Date(prev.created_at)) < 60000;
      grouped.push({ ...msg, grouped: sameUser && sameMinute });
    });
    return grouped;
  };

  return (
    <div className="chat-app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <span className="brand-text">📚 StudyChat</span>
          <button className="toggle-btn" onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <div className="sidebar-section">
          <div className="section-label">ROOMS</div>
          {rooms.map(room => (
            <button
              key={room.id}
              className={`room-btn ${activeRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => setActiveRoom(room)}
            >
              <span className="room-hash">#</span>
              <span className="room-name">{room.name}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="section-label">ONLINE — {onlineUsers.length}</div>
          {onlineUsers.map(u => (
            <div key={u} className="online-user">
              <span className="online-dot" />
              <span>{u}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <Avatar username={user?.username} color={user?.avatar_color} size={32} />
          <span className="footer-username">{user?.username}</span>
          <button className="logout-btn" onClick={logout} title="Logout">⏻</button>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="chat-main">
        <header className="chat-header">
          <div className="header-room">
            <span className="header-hash">#</span>
            <span>{activeRoom?.name || 'Select a room'}</span>
          </div>
          {activeRoom?.description && (
            <span className="header-desc">{activeRoom.description}</span>
          )}
        </header>

        <div className="messages-area">
          {groupMessages(messages).map(msg => (
            <div key={msg.id} className={`message ${msg.grouped ? 'grouped' : ''} ${msg.username === user?.username ? 'own' : ''}`}>
              {!msg.grouped && (
                <div className="msg-header">
                  <Avatar username={msg.username} color={msg.avatar_color} size={32} />
                  <span className="msg-username">{msg.username}</span>
                  <span className="msg-time">{formatTime(msg.created_at)}</span>
                </div>
              )}
              <div className={`msg-body ${msg.grouped ? 'msg-body-grouped' : ''}`}>
                <div className="msg-bubble">{msg.content}</div>
              </div>
            </div>
          ))}

          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              <span className="typing-dots"><span/><span/><span/></span>
              <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="message-form" onSubmit={handleSend}>
          <input
            className="message-input"
            value={input}
            onChange={handleInputChange}
            placeholder={`Message #${activeRoom?.name || '...'}`}
            disabled={!activeRoom}
            autoFocus
          />
          <button type="submit" className="send-btn" disabled={!input.trim()}>
            ➤
          </button>
        </form>
      </main>
    </div>
  );
}
