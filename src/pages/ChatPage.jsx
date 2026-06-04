import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { BACKEND_URL } from '../config';
import { fetchRoomMessages } from '../api/messages';
import MessageContent from '../components/MessageContent';
import CopyButton from '../components/CopyButton';
import EmojiPicker from '../components/EmojiPicker';
import ReplyButton, { truncateReply } from '../components/ReplyButton';

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
  const [replyingTo, setReplyingTo] = useState(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesAreaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);

  const SCROLL_THRESHOLD = 80;
  const LOAD_OLDER_THRESHOLD = 120;

  const isNearBottom = useCallback(() => {
    const el = messagesAreaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const mergeMessages = useCallback((existing, incoming) => {
    const seen = new Set(existing.map((m) => m.id));
    const unique = incoming.filter((m) => !seen.has(m.id));
    return [...existing, ...unique];
  }, []);

  const loadInitialMessages = useCallback(async (roomId) => {
    const { messages: data, hasMore } = await fetchRoomMessages(roomId);
    setMessages(data);
    setHasMoreOlder(hasMore);
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [scrollToBottom]);

  const loadOlderMessages = useCallback(async () => {
    if (!activeRoom || loadingOlderRef.current || !hasMoreOlder) return;
    const oldest = messages[0];
    if (!oldest?.id) return;

    const el = messagesAreaRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    const prevScrollTop = el?.scrollTop ?? 0;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const { messages: older, hasMore } = await fetchRoomMessages(activeRoom.id, {
        before: oldest.id,
      });
      if (older.length > 0) {
        setMessages((prev) => mergeMessages(older, prev));
        requestAnimationFrame(() => {
          if (el) {
            el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop;
          }
        });
      }
      setHasMoreOlder(hasMore);
    } catch {
      /* keep hasMoreOlder so user can retry */
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [activeRoom, hasMoreOlder, messages, mergeMessages]);

  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    if (!el) {
      setInput((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      el.selectionStart = pos;
      el.selectionEnd = pos;
      el.focus();
    });
    sendTyping(activeRoom?.id, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(activeRoom?.id, false), 1500);
  };

  const dedupeRooms = useCallback((list) => {
    const byName = new Map();
    list.forEach((room) => {
      const existing = byName.get(room.name);
      if (!existing || new Date(room.created_at) < new Date(existing.created_at)) {
        byName.set(room.name, room);
      }
    });
    return [...byName.values()].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }, []);

  // Fetch rooms
  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/rooms`).then(res => {
      const unique = dedupeRooms(res.data);
      setRooms(unique);
      if (unique.length > 0) setActiveRoom(unique[0]);
    });
  }, [dedupeRooms]);

  // Join room & fetch messages when room changes
  useEffect(() => {
    if (!activeRoom) return;
    stickToBottomRef.current = true;
    setMessages([]);
    setHasMoreOlder(false);
    joinRoom(activeRoom.id);
    loadInitialMessages(activeRoom.id);
    setTypingUsers([]);
    setReplyingTo(null);
  }, [activeRoom, joinRoom, loadInitialMessages]);

  // Track scroll position; load older messages when scrolled near the top
  useEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      stickToBottomRef.current = isNearBottom();
      if (el.scrollTop <= LOAD_OLDER_THRESHOLD) {
        loadOlderMessages();
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isNearBottom, activeRoom?.id, loadOlderMessages]);

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

  // Only auto-scroll when already at the bottom (don't pull user down while reading history)
  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages, scrollToBottom]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeRoom) return;
    sendMessage(activeRoom.id, input, replyingTo?.id ?? null);
    setInput('');
    setReplyingTo(null);
    sendTyping(activeRoom.id, false);
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    sendTyping(activeRoom?.id, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(activeRoom?.id, false), 1500);
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const startReply = (msg) => {
    setReplyingTo({
      id: msg.id,
      username: msg.username,
      content: msg.content,
    });
    inputRef.current?.focus();
  };

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

        <div className="messages-area" ref={messagesAreaRef}>
          {loadingOlder && (
            <div className="messages-load-older">Loading older messages…</div>
          )}
          {!loadingOlder && hasMoreOlder && messages.length > 0 && (
            <div className="messages-load-hint">Scroll up for older messages</div>
          )}
          {!hasMoreOlder && messages.length > 0 && (
            <div className="messages-start-hint">Beginning of conversation</div>
          )}
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
                <div className="msg-bubble">
                  <div className="msg-actions">
                    <ReplyButton onClick={() => startReply(msg)} />
                    <CopyButton text={msg.content} className="msg-copy-btn" title="Copy message" />
                  </div>
                  {msg.reply_to && (
                    <div className="msg-reply-quote">
                      <span className="msg-reply-quote-user">@{msg.reply_to.username}</span>
                      <span className="msg-reply-quote-text">{truncateReply(msg.reply_to.content)}</span>
                    </div>
                  )}
                  <MessageContent content={msg.content} />
                </div>
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

        {replyingTo && (
          <div className="reply-compose-bar">
            <div className="reply-compose-text">
              <span className="reply-compose-label">Replying to @{replyingTo.username}</span>
              <span className="reply-compose-snippet">{truncateReply(replyingTo.content, 120)}</span>
            </div>
            <button
              type="button"
              className="reply-compose-cancel"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancel reply"
            >
              ✕
            </button>
          </div>
        )}

        <form className="message-form" onSubmit={handleSend}>
          <div className="message-input-wrap">
            <EmojiPicker onSelect={insertEmoji} disabled={!activeRoom} />
            <textarea
              ref={inputRef}
              className="message-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && replyingTo) {
                  e.preventDefault();
                  setReplyingTo(null);
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={
                replyingTo
                  ? `Reply to @${replyingTo.username}…`
                  : `Message #${activeRoom?.name || '...'} (Shift+Enter for new line)`
              }
              disabled={!activeRoom}
              rows={1}
              autoFocus
            />
          </div>
          <button type="submit" className="send-btn" disabled={!input.trim()}>
            ➤
          </button>
        </form>
      </main>
    </div>
  );
}
