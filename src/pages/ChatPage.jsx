import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { BACKEND_URL } from '../config';
import { fetchRoomMessages } from '../api/messages';
import { fetchChats, startDirectChat, createGroupChat } from '../api/chats';
import { uploadFile } from '../api/attachments';
import MessageContent from '../components/MessageContent';
import MessageAttachment from '../components/MessageAttachment';
import PendingUploadBubble from '../components/PendingUploadBubble';
import CopyButton from '../components/CopyButton';
import EmojiPicker from '../components/EmojiPicker';
import ReplyButton, { truncateReply } from '../components/ReplyButton';
import UserSearchModal from '../components/UserSearchModal';
import CreateGroupModal from '../components/CreateGroupModal';
import Avatar from '../components/Avatar';

function roomLabel(room) {
  if (!room) return '';
  if (room.type === 'direct') return room.display_name || room.peer?.username || 'Chat';
  if (room.type === 'group') return room.display_name || room.name;
  return room.name;
}

function roomPrefix(room) {
  if (room?.type === 'public') return '#';
  if (room?.type === 'group') return '👥';
  return null;
}

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const { joinRoom, sendMessage, sendTyping, on } = useSocket(token);
  const [publicRooms, setPublicRooms] = useState([]);
  const [directChats, setDirectChats] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const activeRoomIdRef = useRef(null);

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

  const refreshChats = useCallback(async () => {
    const { direct, groups } = await fetchChats();
    setDirectChats(direct);
    setGroupChats(groups);
    return { direct, groups };
  }, []);

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

  useEffect(() => {
    Promise.all([
      axios.get(`${BACKEND_URL}/api/rooms`),
      fetchChats(),
    ]).then(([roomsRes, chats]) => {
      const unique = dedupeRooms(roomsRes.data.map((r) => ({ ...r, type: 'public' })));
      setPublicRooms(unique);
      setDirectChats(chats.direct);
      setGroupChats(chats.groups);
      if (chats.direct.length > 0) {
        setActiveRoom(chats.direct[0]);
      } else if (unique.length > 0) {
        setActiveRoom(unique[0]);
      }
    });
  }, [dedupeRooms]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoom?.id ?? null;
  }, [activeRoom?.id]);

  useEffect(() => {
    if (!activeRoom) return;
    stickToBottomRef.current = true;
    setMessages([]);
    setHasMoreOlder(false);
    joinRoom(activeRoom.id);
    loadInitialMessages(activeRoom.id);
    setTypingUsers([]);
    setReplyingTo(null);
    setPendingUpload((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, [activeRoom, joinRoom, loadInitialMessages]);

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

  useEffect(() => {
    const offMsg = on('new_message', (msg) => {
      if (msg.room_id && msg.room_id !== activeRoomIdRef.current) {
        refreshChats();
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      refreshChats();
    });
    const offOnline = on('online_users', (users) => setOnlineUsers(users));
    const offTyping = on('user_typing', ({ username, isTyping }) => {
      setTypingUsers((prev) =>
        isTyping ? [...new Set([...prev, username])] : prev.filter((u) => u !== username)
      );
    });
    return () => { offMsg?.(); offOnline?.(); offTyping?.(); };
  }, [on, refreshChats]);

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages, scrollToBottom]);

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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeRoom || uploading) return;

    const caption = input.trim();
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

    setUploading(true);
    setPendingUpload({ file, progress: 0, previewUrl, caption });
    stickToBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
      await uploadFile(activeRoom.id, file, {
        content: caption,
        replyToId: replyingTo?.id ?? null,
        onProgress: (percent) => {
          setPendingUpload((prev) => (prev ? { ...prev, progress: percent } : prev));
        },
      });
      setInput('');
      setReplyingTo(null);
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to upload file';
      alert(message);
    } finally {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPendingUpload(null);
      setUploading(false);
    }
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

  const selectRoom = (room) => setActiveRoom(room);

  const handleStartDirect = async (targetUser) => {
    const room = await startDirectChat(targetUser.id);
    if (!room?.id) throw new Error('Could not open chat');
    const chatRoom = { ...room, type: 'direct' };
    setDirectChats((prev) => {
      const exists = prev.find((r) => r.id === chatRoom.id);
      if (exists) {
        return prev.map((r) => (r.id === chatRoom.id ? { ...r, ...chatRoom } : r));
      }
      return [chatRoom, ...prev];
    });
    setActiveRoom(chatRoom);
    setShowNewChat(false);
  };

  const handleCreateGroup = async (name, memberIds) => {
    const room = await createGroupChat(name, memberIds);
    setGroupChats((prev) => [room, ...prev]);
    setActiveRoom(room);
    setShowNewGroup(false);
  };

  const renderChatItem = (room) => {
    const label = roomLabel(room);
    const prefix = roomPrefix(room);
    const avatarColor = room.type === 'direct' ? room.peer?.avatar_color : null;
    const avatarName = room.type === 'direct' ? room.peer?.username : label;

    return (
      <button
        key={room.id}
        className={`flex items-center gap-2.5 w-full p-2.5 rounded-lg text-left transition-colors ${
          activeRoom?.id === room.id ? 'bg-wa-accent/15' : 'hover:bg-wa-surface/60'
        }`}
        onClick={() => selectRoom(room)}
      >
        {room.type === 'direct' ? (
          <Avatar username={avatarName} color={avatarColor} size={40} />
        ) : (
          <span className="w-10 h-10 rounded-full bg-wa-surface flex items-center justify-center text-lg shrink-0">
            {prefix || '💬'}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate text-slate-100">{label}</div>
          {room.last_message && (
            <div className="text-xs text-wa-muted truncate">{truncateReply(room.last_message, 40)}</div>
          )}
        </div>
      </button>
    );
  };

  const headerAvatar = activeRoom?.type === 'direct' && activeRoom.peer
    ? <Avatar username={activeRoom.peer.username} color={activeRoom.peer.avatar_color} size={36} />
    : null;

  const placeholder = activeRoom?.type === 'direct'
    ? `Message ${roomLabel(activeRoom)}…`
    : activeRoom?.type === 'group'
      ? `Message ${roomLabel(activeRoom)}…`
      : `Message #${activeRoom?.name || '...'} (Shift+Enter for new line)`;

  const isOwn = (msg) => msg.username === user?.username;

  return (
    <div className="flex h-screen overflow-hidden">
      {showNewChat && (
        <UserSearchModal title="New chat" onSelect={handleStartDirect} onClose={() => setShowNewChat(false)} />
      )}
      {showNewGroup && (
        <CreateGroupModal onCreate={handleCreateGroup} onClose={() => setShowNewGroup(false)} />
      )}

      <aside
        className={`flex flex-col bg-wa-dark border-r border-wa-border transition-all overflow-hidden ${
          sidebarOpen ? 'w-60 min-w-[240px]' : 'w-[52px] min-w-[52px]'
        }`}
      >
        <div className="flex items-center gap-2 px-3 h-[60px] border-b border-wa-border shrink-0">
          <img src="/favicon.png" alt="" className="w-7 h-7 rounded-md shrink-0" />
          {sidebarOpen && <span className="font-bold text-sm truncate">StudyChat</span>}
          <button
            className="ml-auto text-wa-muted hover:text-slate-200 text-base shrink-0"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        {sidebarOpen && (
          <div className="flex flex-col gap-1 p-2 border-b border-wa-border shrink-0">
            <button
              type="button"
              className="w-full px-2.5 py-2 rounded-lg bg-wa-surface/80 hover:bg-wa-surface text-sm text-left"
              onClick={() => setShowNewChat(true)}
            >
              💬 New chat
            </button>
            <button
              type="button"
              className="w-full px-2.5 py-2 rounded-lg bg-wa-surface/80 hover:bg-wa-surface text-sm text-left"
              onClick={() => setShowNewGroup(true)}
            >
              👥 New group
            </button>
          </div>
        )}

        {sidebarOpen && (
          <>
            <div className="p-2 overflow-y-auto max-h-[28vh] shrink-0">
              <div className="text-[11px] font-semibold text-wa-muted tracking-wider px-2 pb-2">CHATS</div>
              {directChats.length === 0 && (
                <p className="text-xs text-wa-muted px-2">Search someone to start chatting</p>
              )}
              {directChats.map(renderChatItem)}
            </div>

            <div className="p-2 overflow-y-auto max-h-[28vh] shrink-0">
              <div className="text-[11px] font-semibold text-wa-muted tracking-wider px-2 pb-2">GROUPS</div>
              {groupChats.length === 0 && (
                <p className="text-xs text-wa-muted px-2">Create a group to chat together</p>
              )}
              {groupChats.map(renderChatItem)}
            </div>

            <div className="p-2 overflow-y-auto max-h-[22vh] shrink-0">
              <div className="text-[11px] font-semibold text-wa-muted tracking-wider px-2 pb-2">CHANNELS</div>
              {publicRooms.map((room) => (
                <button
                  key={room.id}
                  className={`flex items-center gap-2.5 w-full p-2.5 rounded-lg text-left transition-colors ${
                    activeRoom?.id === room.id ? 'bg-wa-accent/15' : 'hover:bg-wa-surface/60'
                  }`}
                  onClick={() => selectRoom(room)}
                >
                  <span className="w-10 h-10 rounded-full bg-wa-surface flex items-center justify-center text-lg shrink-0">#</span>
                  <span className="font-semibold text-sm truncate">{room.name}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 p-2 overflow-y-auto min-h-[60px]">
              <div className="text-[11px] font-semibold text-wa-muted tracking-wider px-2 pb-2">
                ONLINE — {onlineUsers.length}
              </div>
              {onlineUsers.map((u) => (
                <div key={u} className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-wa-muted">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="truncate">{u}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-2.5 p-3 border-t border-wa-border shrink-0">
          <Avatar username={user?.username} color={user?.avatar_color} size={32} />
          {sidebarOpen && <span className="text-sm font-semibold flex-1 truncate">{user?.username}</span>}
          {sidebarOpen && (
            <button className="text-wa-muted hover:text-red-400 text-base" onClick={logout} title="Logout">
              ⏻
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-wa-chat">
        <header className="flex items-center gap-3 px-5 h-[60px] border-b border-wa-border bg-wa-panel shrink-0">
          {headerAvatar}
          <div className="flex items-center gap-1.5 font-semibold text-base">
            {activeRoom?.type === 'public' && <span className="text-wa-muted">#</span>}
            {activeRoom?.type === 'group' && <span>👥</span>}
            <span>{roomLabel(activeRoom) || 'Select a chat'}</span>
          </div>
          {activeRoom?.type === 'group' && activeRoom.member_count && (
            <span className="text-sm text-wa-muted border-l border-wa-border pl-3">
              {activeRoom.member_count} members
            </span>
          )}
          {activeRoom?.type === 'public' && activeRoom?.description && (
            <span className="text-sm text-wa-muted border-l border-wa-border pl-3">{activeRoom.description}</span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-0.5 chat-wallpaper" ref={messagesAreaRef}>
          {loadingOlder && <p className="text-center text-sm text-wa-muted py-2">Loading older messages…</p>}
          {!loadingOlder && hasMoreOlder && messages.length > 0 && (
            <p className="text-center text-xs text-wa-muted py-2">Scroll up for older messages</p>
          )}
          {!hasMoreOlder && messages.length > 0 && (
            <p className="text-center text-xs text-wa-muted py-2 border-b border-wa-border mb-2">Beginning of conversation</p>
          )}
          {groupMessages(messages).map((msg) => (
            <div key={msg.id} className={`py-0.5 ${!msg.grouped ? 'mt-3' : ''}`}>
              {!msg.grouped && !isOwn(msg) && (
                <div className="flex items-center gap-2.5 mb-1">
                  <Avatar username={msg.username} color={msg.avatar_color} size={32} />
                  <span className="font-semibold text-sm">{msg.username}</span>
                  <span className="text-[11px] text-wa-muted">{formatTime(msg.created_at)}</span>
                </div>
              )}
              <div className={`flex ${isOwn(msg) ? 'justify-end' : ''} ${!isOwn(msg) && !msg.grouped ? 'pl-[42px]' : ''} ${!isOwn(msg) && msg.grouped ? 'pl-[42px]' : ''}`}>
                <div
                  className={`relative inline-block max-w-[min(65%,520px)] text-sm leading-relaxed shadow-sm ${
                    isOwn(msg)
                      ? 'bg-wa-bubble rounded-lg rounded-br-sm pl-3.5 pr-14 py-2'
                      : 'bg-wa-surface rounded-lg rounded-bl-sm pl-3.5 pr-14 py-2'
                  }`}
                >
                  <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-55 hover:opacity-100 transition-opacity">
                    <ReplyButton onClick={() => startReply(msg)} />
                    {msg.content && <CopyButton text={msg.content} title="Copy message" />}
                  </div>
                  {msg.reply_to && (
                    <div className="flex flex-col gap-0.5 mb-1.5 p-1.5 border-l-[3px] border-wa-accent rounded bg-black/20 text-xs">
                      <span className="font-semibold text-wa-accent-hover">@{msg.reply_to.username}</span>
                      <span className="text-wa-muted truncate">{truncateReply(msg.reply_to.content)}</span>
                    </div>
                  )}
                  {msg.attachment && <MessageAttachment attachment={msg.attachment} />}
                  {msg.content && <MessageContent content={msg.content} />}
                  {msg.grouped && (
                    <span className="block text-[10px] text-wa-muted text-right mt-0.5">{formatTime(msg.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {pendingUpload && (
            <PendingUploadBubble
              file={pendingUpload.file}
              progress={pendingUpload.progress}
              previewUrl={pendingUpload.previewUrl}
              caption={pendingUpload.caption}
            />
          )}

          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-wa-muted mt-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-wa-accent typing-dot" />
              </span>
              <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {replyingTo && (
          <div className="flex items-center gap-3 px-5 py-2.5 border-t border-wa-border bg-wa-panel">
            <div className="flex-1 min-w-0 border-l-[3px] border-wa-accent pl-2.5">
              <span className="block text-xs font-semibold text-wa-accent-hover">Replying to @{replyingTo.username}</span>
              <span className="block text-sm text-wa-muted truncate">{truncateReply(replyingTo.content, 120)}</span>
            </div>
            <button
              type="button"
              className="w-7 h-7 rounded-md bg-wa-surface text-wa-muted hover:text-slate-200"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancel reply"
            >
              ✕
            </button>
          </div>
        )}

        <form className="flex items-end gap-2.5 px-5 py-3 border-t border-wa-border bg-wa-panel" onSubmit={handleSend}>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
            onChange={handleFileSelect}
          />
          <div className="flex-1 flex items-end gap-2 bg-wa-surface border border-wa-border rounded-xl px-2 py-1.5 focus-within:border-wa-accent transition-colors">
            <button
              type="button"
              className="w-9 h-9 rounded-lg text-lg hover:bg-wa-panel disabled:opacity-40 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeRoom || uploading}
              title="Attach file"
            >
              📎
            </button>
            <EmojiPicker onSelect={insertEmoji} disabled={!activeRoom} />
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent border-none outline-none text-sm py-2 min-h-9 max-h-40 resize-none placeholder:text-wa-muted"
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
              placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : placeholder}
              disabled={!activeRoom}
              rows={1}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-4 py-3 bg-wa-accent hover:bg-wa-accent-hover disabled:opacity-40 rounded-xl text-white text-base transition-colors"
            disabled={!input.trim()}
          >
            ➤
          </button>
        </form>
      </main>
    </div>
  );
}
